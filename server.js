const express = require('express');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

// Handle uncaught errors globally
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️  Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.warn('⚠️  Uncaught Exception:', err.message);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Import bot handler (will create this next)
let botHandler = null;
let slackApp = null;

// Initialize Supabase for persistent storage
const SupabaseClient = require('./src/supabase-client');
const supabase = new SupabaseClient();

// Fallback in-memory session storage (used if Supabase not configured)
const inMemorySessions = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bot: botHandler ? 'connected' : 'disconnected',
    supabase: supabase.isConnected() ? 'connected' : 'disconnected'
  });
});

// Get all chat sessions (for sidebar)
app.get('/api/sessions', async (req, res) => {
  try {
    if (!supabase.isConnected()) {
      return res.json({ sessions: [] });
    }

    const { data, error } = await supabase.client
      .from('chat_sessions')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ sessions: data || [] });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.json({ sessions: [] });
  }
});

// Get messages for a specific session
app.get('/api/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!supabase.isConnected()) {
      return res.json({ messages: [] });
    }

    const messages = await supabase.getSessionMessages(sessionId, 100);
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.json({ messages: [] });
  }
});

// Create new chat session
app.post('/api/sessions/new', async (req, res) => {
  try {
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    if (supabase.isConnected()) {
      await supabase.createSession(sessionId);
    }

    res.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Slack webhook endpoint
app.post('/slack/events', async (req, res) => {
  if (slackApp) {
    try {
      // Use Bolt's request handler
      const handler = slackApp.receiver.requestHandler();
      await handler(req, res);
    } catch (error) {
      console.error('Error handling Slack event:', error);
      res.status(500).send('Internal server error');
    }
  } else {
    res.status(503).send('Bot not initialized');
  }
});

// Simple test endpoint to verify Asana connection
app.get('/test-asana', async (req, res) => {
  try {
    const AsanaClient = require('./src/asana-client');
    const client = new AsanaClient();

    const projects = await client.getClientProjects();
    res.json({
      status: 'ok',
      projectCount: projects.length,
      firstFive: projects.slice(0, 5).map(p => ({ name: p.name, id: p.gid }))
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Test endpoint for query parsing
app.post('/test-query', (req, res) => {
  try {
    const QueryRouter = require('./src/query-router');
    const router = new QueryRouter();

    const message = req.body.message || '';
    const result = router.parseQuery(message);

    res.json({
      message,
      parsed: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Chat API endpoint - integrates with Asana
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    console.log('💬 Chat message received:', message);
    console.log('🆔 Session ID:', sessionId || 'none');

    // Get or create session (Supabase or in-memory fallback)
    const sid = sessionId || 'default-session';
    let session;
    let conversationHistory = [];

    if (supabase.isConnected()) {
      // Use Supabase for persistent storage
      session = await supabase.getOrCreateSession(sid);
      conversationHistory = await supabase.getConversationHistory(sid, 10);
      console.log('💾 Supabase session loaded:', sid);
    } else {
      // Fallback to in-memory
      if (!inMemorySessions.has(sid)) {
        inMemorySessions.set(sid, {
          currentClient: null,
          conversationHistory: []
        });
        console.log('✨ New in-memory session created:', sid);
      }
      session = inMemorySessions.get(sid);
      conversationHistory = session.conversationHistory;
    }

    const currentClient = supabase.isConnected() ? session?.current_client : session?.currentClient;
    console.log('📊 Session state:', {
      currentClient: currentClient,
      historyLength: conversationHistory.length,
      storage: supabase.isConnected() ? 'Supabase' : 'In-Memory'
    });

    // Initialize components
    const AsanaClient = require('./src/asana-client');
    const OpenAIIntentExtractor = require('./src/openai-intent-extractor');
    const ClientMatcher = require('./src/client-matcher');
    const CoachingResponseGenerator = require('./src/coaching-response-generator');
    const GoogleSheetsClient = require('./src/google-sheets-client');

    const asanaClient = new AsanaClient();
    const intentExtractor = new OpenAIIntentExtractor();
    const clientMatcher = new ClientMatcher();
    const coachingGenerator = new CoachingResponseGenerator();
    const sheetsClient = new GoogleSheetsClient();

    // Extract intent using OpenAI with conversation context
    console.log('🤖 Extracting intent with context...');
    const intentResult = await intentExtractor.extractIntent(
      message,
      conversationHistory,
      currentClient
    );
    console.log('📊 Intent result:', intentResult);

    if (!intentResult.success) {
      return res.json({
        response: 'I had trouble understanding that. Could you rephrase your question?'
      });
    }

    const { clientName, intent, timeRange } = intentResult;

    if (timeRange) {
      console.log(`⏰ Time filter detected: ${timeRange}`);
    }

    if (clientName === 'unknown') {
      return res.json({
        response: 'I couldn\'t identify which client or project you\'re asking about. Could you be more specific?'
      });
    }

    // Get all teams (clients)
    console.log('📦 Fetching teams (clients)...');
    const teams = await asanaClient.getClientTeams();
    console.log(`✅ Found ${teams.length} teams`);

    // Match client name to team
    console.log('🔍 Matching client name:', clientName);
    const match = await clientMatcher.findProject(clientName, teams);

    if (!match) {
      const teamNames = teams.slice(0, 5).map(t => t.name).join(', ');
      return res.json({
        response: `I couldn't find a client for "${clientName}". Here are some available clients: ${teamNames}...`
      });
    }

    if (match.ambiguous) {
      const msg = formatter.formatAmbiguous(match.matches);
      return res.json({
        response: msg
      });
    }

    // Get the "Progress" project for this team
    console.log('📊 Fetching Progress project for team...');
    const teamGid = match.gid;
    const clientName_matched = match.name;
    const progressProject = await asanaClient.getTeamProgressProject(teamGid);

    if (!progressProject) {
      return res.json({
        response: `I found the client "${clientName_matched}", but they don't have a Progress project yet.`
      });
    }

    // Fetch project stats with time filter
    console.log('📊 Fetching project stats...');
    const projectId = progressProject.gid;
    const projectName = clientName_matched; // Use team name as client name
    const stats = await asanaClient.getProjectStats(projectId, timeRange);

    // Try to fetch P&L data from Google Sheets (if available)
    console.log('💰 Checking for P&L data in Google Sheets...');
    try {
      const plData = await sheetsClient.getClientPLByName(clientName_matched);
      if (plData) {
        console.log(`✅ Found P&L data for ${plData.clientName}`);
        stats.plData = sheetsClient.formatPLForAI(plData);
      } else {
        console.log('ℹ️  No P&L sheet found for this client');
      }
    } catch (err) {
      console.log('⚠️  Could not fetch P&L data:', err.message);
    }

    // Check if there's a scheduled meeting in the last comment
    // If so, search for meeting transcripts
    let meetingTranscripts = null;
    if (stats.recentComments && stats.recentComments.length > 0) {
      const lastComment = stats.recentComments[0]?.comments?.[0]?.text?.toLowerCase() || '';
      const hasMeetingMention = lastComment.includes('meeting') ||
                                lastComment.includes('call') ||
                                lastComment.includes('catch-up') ||
                                lastComment.includes('catch up') ||
                                lastComment.includes('schedule') ||
                                lastComment.includes('1:1') ||
                                lastComment.includes('1-1');

      if (hasMeetingMention) {
        console.log('📝 Meeting mentioned in last comment - searching for transcripts...');
        // Get the date of the last comment to search for transcripts after that
        const lastCommentDate = stats.recentComments[0]?.comments?.[0]?.date;
        meetingTranscripts = await asanaClient.getMeetingTranscripts(teamGid, lastCommentDate);
        stats.meetingTranscripts = meetingTranscripts;
      }
    }

    // Generate conversational coaching response
    console.log('🎯 Generating coaching response...');
    const responseText = await coachingGenerator.generateResponse(
      message, // The actual question the user asked
      projectName,
      stats,
      conversationHistory
    );
    console.log('✅ Response ready');

    // Save conversation to Supabase or in-memory
    if (supabase.isConnected()) {
      await supabase.saveConversationTurn(sid, message, responseText, projectName);
      console.log('💾 Conversation saved to Supabase');
    } else {
      session.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: responseText }
      );
      session.currentClient = projectName;
      console.log('💾 Conversation saved to memory');
    }

    console.log('💾 Session updated:', {
      currentClient: projectName,
      storage: supabase.isConnected() ? 'Supabase' : 'In-Memory'
    });

    res.json({
      response: responseText,
      sessionId: sid
    });
  } catch (error) {
    console.error('❌ Chat API error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred while processing your request'
    });
  }
});

// Initialize bot and start server
async function start() {
  try {
    // Only initialize Slack bot if token is present
    if (process.env.SLACK_BOT_TOKEN) {
      try {
        const BotHandler = require('./src/slack-bot');
        botHandler = new BotHandler();

        // Start the bot (connects via Socket Mode)
        await botHandler.start();

        slackApp = botHandler.getApp();
        console.log('✅ Slack bot initialized');
      } catch (botError) {
        console.warn('⚠️  Warning: Slack bot initialization failed - webhook still available');
        console.warn(`   Error: ${botError.message}`);
      }
    } else {
      console.log('⚠️  SLACK_BOT_TOKEN not set - bot features disabled');
      console.log('   Test endpoints available at /test-asana and /test-query');
    }

    // Start Express server
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: GET /health`);
      console.log(`🧪 Test Asana: GET /test-asana`);
      console.log(`🧪 Test Query: POST /test-query (body: {message: "..."})`);

      if (process.env.SLACK_BOT_TOKEN) {
        console.log(`💬 Slack bot ready for webhooks!`);
        console.log(`   Webhook endpoint: POST /slack/events`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
