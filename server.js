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

// In-memory session storage for conversation context
// In production, move this to Supabase
const sessions = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bot: botHandler ? 'connected' : 'disconnected'
  });
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

    // Get or create session
    const sid = sessionId || 'default-session';
    if (!sessions.has(sid)) {
      sessions.set(sid, {
        currentClient: null,
        conversationHistory: []
      });
      console.log('✨ New session created:', sid);
    }

    const session = sessions.get(sid);
    console.log('📊 Session state:', {
      currentClient: session.currentClient,
      historyLength: session.conversationHistory.length
    });

    // Initialize components
    const AsanaClient = require('./src/asana-client');
    const OpenAIIntentExtractor = require('./src/openai-intent-extractor');
    const ClientMatcher = require('./src/client-matcher');
    const CoachingResponseGenerator = require('./src/coaching-response-generator');

    const asanaClient = new AsanaClient();
    const intentExtractor = new OpenAIIntentExtractor();
    const clientMatcher = new ClientMatcher();
    const coachingGenerator = new CoachingResponseGenerator();

    // Extract intent using OpenAI with conversation context
    console.log('🤖 Extracting intent with context...');
    const intentResult = await intentExtractor.extractIntent(
      message,
      session.conversationHistory,
      session.currentClient
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

    // Generate conversational coaching response
    console.log('🎯 Generating coaching response...');
    const responseText = await coachingGenerator.generateResponse(
      message, // The actual question the user asked
      projectName,
      stats,
      session.conversationHistory
    );
    console.log('✅ Response ready');

    // Update session with conversation history and current client
    session.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: responseText }
    );
    session.currentClient = projectName;

    console.log('💾 Session updated:', {
      currentClient: session.currentClient,
      historyLength: session.conversationHistory.length
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
