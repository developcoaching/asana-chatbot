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
      .select('session_id, current_client, coach_name, last_activity, created_at')
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
    const { coachName } = req.body || {};
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    if (supabase.isConnected()) {
      await supabase.createSession(sessionId, null, coachName);
    }

    res.json({ sessionId, coachName });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Coach login - sets coach name for current/new session
app.post('/api/coach/login', async (req, res) => {
  try {
    const { coachName, sessionId } = req.body;

    if (!coachName || !coachName.trim()) {
      return res.status(400).json({ error: 'Coach name is required' });
    }

    const trimmedName = coachName.trim();
    console.log(`🧑‍🏫 Coach login: ${trimmedName}`);

    // If session exists, update it with coach name
    if (sessionId && supabase.isConnected()) {
      await supabase.updateSessionCoach(sessionId, trimmedName);
      return res.json({ success: true, coachName: trimmedName, sessionId });
    }

    // Otherwise just return success (coach name will be used when creating new session)
    res.json({ success: true, coachName: trimmedName });
  } catch (error) {
    console.error('Error in coach login:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of available coaches (for dropdown)
app.get('/api/coaches', (req, res) => {
  const coaches = [
    { name: 'Greg', role: 'Lead Coach' },
    { name: 'Jamie Mills', role: 'Coach' },
    { name: 'Nick Tobing', role: 'Coach' },
    { name: 'Harmeet Johal', role: 'Coach' }
  ];
  res.json({ coaches });
});

// Search chat messages
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json({ results: [] });
    }

    if (!supabase.isConnected()) {
      return res.json({ results: [], error: 'Search unavailable' });
    }

    const searchQuery = q.trim().toLowerCase();
    console.log('🔍 Searching for:', searchQuery);

    // Search in chat_messages table using ilike for case-insensitive search
    const { data: messages, error } = await supabase.client
      .from('chat_messages')
      .select('id, session_id, role, content, created_at')
      .or(`content.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Group results by session and add context
    const sessionMap = new Map();
    for (const msg of messages || []) {
      if (!sessionMap.has(msg.session_id)) {
        sessionMap.set(msg.session_id, []);
      }
      sessionMap.get(msg.session_id).push(msg);
    }

    // Get session info for each session
    const sessionIds = [...sessionMap.keys()];
    let sessions = [];
    if (sessionIds.length > 0) {
      const { data: sessionData } = await supabase.client
        .from('chat_sessions')
        .select('session_id, current_client, last_activity')
        .in('session_id', sessionIds);
      sessions = sessionData || [];
    }

    // Build results with session context
    const results = [];
    for (const [sessionId, msgs] of sessionMap) {
      const session = sessions.find(s => s.session_id === sessionId);
      for (const msg of msgs) {
        results.push({
          id: msg.id,
          sessionId: sessionId,
          sessionTitle: session?.current_client || 'Conversation',
          role: msg.role,
          content: msg.content,
          createdAt: msg.created_at,
          // Create a snippet around the match
          snippet: createSearchSnippet(msg.content, searchQuery)
        });
      }
    }

    console.log(`✅ Found ${results.length} search results`);
    res.json({ results });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: error.message, results: [] });
  }
});

// Helper to create a snippet around the search match
function createSearchSnippet(content, query) {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(query);

  if (index === -1) {
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 100);

  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += content.substring(start, end);
  if (end < content.length) snippet += '...';

  return snippet;
}

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
    const LanguagePreprocessor = require('./src/language-preprocessor');
    const DateNormalizer = require('./src/date-normalizer');

    const asanaClient = new AsanaClient();
    const intentExtractor = new OpenAIIntentExtractor();
    const clientMatcher = new ClientMatcher();
    const coachingGenerator = new CoachingResponseGenerator();
    const sheetsClient = new GoogleSheetsClient();
    const preprocessor = new LanguagePreprocessor();
    const dateNormalizer = new DateNormalizer();

    // PHASE 1: Pre-process the message BEFORE intent extraction
    // This is deterministic - no AI, just string cleanup
    const cleanedMessage = preprocessor.process(message);
    console.log('🧹 Pre-processed message:', cleanedMessage);
    if (cleanedMessage !== message.toLowerCase().trim()) {
      console.log('   Original:', message);
      console.log('   Cleaned:', cleanedMessage);
    }

    // PHASE 3: Date normalization - parse dates BEFORE GPT
    const dateResult = dateNormalizer.normalizeInText(cleanedMessage);
    let normalizedDate = null;
    let dateRange = null;
    if (dateResult.dateInfo) {
      console.log('📅 Date detected:', JSON.stringify(dateResult.dateInfo));
      if (dateResult.dateInfo.type === 'single') {
        normalizedDate = dateResult.dateInfo.date;
      } else if (dateResult.dateInfo.type === 'range') {
        dateRange = {
          start: dateResult.dateInfo.start,
          end: dateResult.dateInfo.end,
          label: dateResult.dateInfo.label
        };
      }
    }

    // Extract comprehensive intent using OpenAI with conversation context
    // GPT now receives CLEAN input - no typos, normalized terminology
    console.log('🤖 Extracting intent with context...');
    const intentResult = await intentExtractor.extractIntent(
      cleanedMessage,  // Use cleaned message, not raw
      conversationHistory,
      currentClient
    );
    console.log('📊 Intent result:', JSON.stringify(intentResult, null, 2));

    if (!intentResult.success) {
      return res.json({
        response: 'I had trouble understanding that. Could you rephrase your question?'
      });
    }

    // Destructure all extracted fields
    let {
      clientNames,
      clientName,
      intent,
      taskName,
      projectName,
      sectionName,
      specificDate,
      timeRange,
      searchKeywords,
      taskStatus,
      assignee,
      commentAuthor,
      actionData
    } = intentResult;

    // OVERRIDE GPT's date parsing with our deterministic date normalization
    // Our date normalizer runs BEFORE GPT and is more reliable
    if (normalizedDate) {
      specificDate = normalizedDate;
      console.log(`📅 Using deterministic date: ${specificDate}`);
    }
    if (dateRange) {
      // Convert date range to timeRange label for existing code
      timeRange = dateRange.label;
      // Also store the actual range for filtering
      intentResult.dateRange = dateRange;
      console.log(`📅 Using deterministic date range: ${dateRange.start} to ${dateRange.end}`);
    }

    console.log(`🎯 Intent: ${intent}`);
    console.log(`👥 Clients: ${clientNames.join(', ')}`);
    if (taskName) console.log(`📋 Task: ${taskName}`);
    if (projectName) console.log(`📁 Project: ${projectName}`);
    if (sectionName) console.log(`📑 Section: ${sectionName}`);
    if (specificDate) console.log(`📅 Date: ${specificDate}`);
    if (timeRange) console.log(`⏰ Time range: ${timeRange}`);
    if (searchKeywords) console.log(`🔍 Keywords: ${searchKeywords.join(', ')}`);
    if (taskStatus) console.log(`📊 Status filter: ${taskStatus}`);
    if (assignee) console.log(`👤 Assignee filter: ${assignee}`);
    if (commentAuthor) console.log(`💬 Comment author filter: ${commentAuthor}`);

    if (clientNames.length === 1 && clientNames[0] === 'unknown') {
      return res.json({
        response: 'I couldn\'t identify which client or project you\'re asking about. Could you be more specific?'
      });
    }

    // Get all teams (clients) once
    console.log('📦 Fetching teams (clients)...');
    const teams = await asanaClient.getClientTeams();
    console.log(`✅ Found ${teams.length} teams`);

    // ============================================================
    // MULTI-CLIENT SUPPORT - Process each client and aggregate results
    // ============================================================
    const multiClientResults = [];
    let primaryClientName = null;

    for (const clientNameToMatch of clientNames) {
      console.log(`🔍 Matching client name: ${clientNameToMatch}`);
      const match = await clientMatcher.findProject(clientNameToMatch, teams);

      // Handle new client-matcher response formats
      // Case 1: Direct match (has gid property) - high confidence auto-selected
      if (match && match.gid) {
        // Successfully matched - proceed below
      }
      // Case 2: Not found with suggestions
      else if (match && match.notFound) {
        console.log(`❌ No match found for "${clientNameToMatch}"`);
        const suggestionText = match.suggestions && match.suggestions.length > 0
          ? `\n\nDid you mean one of these?\n• ${match.suggestions.map(s => s.name).join('\n• ')}`
          : '';
        multiClientResults.push({
          clientName: clientNameToMatch,
          error: `I couldn't find a client matching "${clientNameToMatch}".${suggestionText}`,
          found: false,
          suggestions: match.suggestions
        });
        continue;
      }
      // Case 3: Low confidence with suggestions
      else if (match && match.lowConfidence) {
        console.log(`❓ Low confidence match for "${clientNameToMatch}" - best guess: ${match.bestGuess.name}`);
        // Use best guess but note the uncertainty
        const teamGid = match.bestGuess.gid;
        const clientName_matched = match.bestGuess.name;
        if (!primaryClientName) primaryClientName = clientName_matched;

        console.log(`✅ Using best guess: "${clientNameToMatch}" → "${clientName_matched}" (score: ${match.bestGuessScore.toFixed(2)})`);

        let clientStats = {
          clientName: clientName_matched,
          teamGid: teamGid,
          found: true,
          lowConfidence: true,
          suggestions: match.suggestions
        };

        if (clientNames.length > 1 || intent === 'get_conversation' || intent === 'compare') {
          let conversations = await asanaClient.getAllConversations(teamGid, {
            timeRange: timeRange,
            limit: 10
          });

          // Filter by comment author if specified
          if (commentAuthor && conversations && conversations.length > 0) {
            const authorLower = commentAuthor.toLowerCase();
            conversations = conversations.filter(conv => {
              const convAuthor = (conv.author || '').toLowerCase();
              return convAuthor.includes(authorLower) || authorLower.includes(convAuthor.split(' ')[0]);
            });
          }

          clientStats.conversations = conversations;
          clientStats.latestConversation = conversations[0] || null;
        }

        multiClientResults.push(clientStats);
        continue;
      }
      // Case 4: Ambiguous - multiple equally good matches
      else if (match && match.ambiguous) {
        console.log(`⚠️ Ambiguous match for "${clientNameToMatch}"`);
        const matchNames = match.suggestions.map(s => s.name).join('\n• ');
        multiClientResults.push({
          clientName: clientNameToMatch,
          error: `I found multiple possible matches for "${clientNameToMatch}":\n• ${matchNames}\n\nWhich one did you mean?`,
          found: false,
          ambiguous: true,
          suggestions: match.suggestions
        });
        continue;
      }
      // Case 5: No match at all
      else if (!match) {
        console.log(`❌ No match found for "${clientNameToMatch}"`);
        multiClientResults.push({
          clientName: clientNameToMatch,
          error: `Client "${clientNameToMatch}" not found`,
          found: false
        });
        continue;
      }

      // Successfully matched (high confidence)
      const teamGid = match.gid;
      const clientName_matched = match.name;
      if (!primaryClientName) primaryClientName = clientName_matched;

      console.log(`✅ Matched "${clientNameToMatch}" → "${clientName_matched}"`);

      // Fetch data for this client based on intent
      let clientStats = {
        clientName: clientName_matched,
        teamGid: teamGid,
        found: true
      };

      // For multi-client queries, fetch conversations for each
      if (clientNames.length > 1 || intent === 'get_conversation' || intent === 'compare') {
        let conversations = await asanaClient.getAllConversations(teamGid, {
          timeRange: timeRange,
          limit: 10
        });

        // Filter by comment author if specified
        if (commentAuthor && conversations && conversations.length > 0) {
          const authorLower = commentAuthor.toLowerCase();
          conversations = conversations.filter(conv => {
            const convAuthor = (conv.author || '').toLowerCase();
            return convAuthor.includes(authorLower) || authorLower.includes(convAuthor.split(' ')[0]);
          });
        }

        clientStats.conversations = conversations;
        clientStats.latestConversation = conversations[0] || null;
      }

      multiClientResults.push(clientStats);
    }

    // Use first successfully matched client as primary
    const primaryClient = multiClientResults.find(r => r.found);
    if (!primaryClient) {
      const errors = multiClientResults.map(r => r.error).join('; ');
      return res.json({
        response: `I couldn't find any of the clients you mentioned. ${errors}`
      });
    }

    const teamGid = primaryClient.teamGid;
    const clientName_matched = primaryClient.clientName;

    // Initialize stats object that will be passed to response generator
    let stats = {
      intent: intent,
      clientName: clientName_matched,
      teamGid: teamGid,
      // Include multi-client results if more than one client
      multiClientResults: clientNames.length > 1 ? multiClientResults : null,
      isMultiClient: clientNames.length > 1,
    };

    // ============================================================
    // INTENT-BASED ROUTING - Different data retrieval per intent
    // ============================================================

    if (intent === 'list_projects') {
      // List all projects for this client
      console.log('📁 Listing all projects...');
      const projects = await asanaClient.getAllTeamProjects(teamGid);
      stats.allProjects = projects;
      stats.projectCount = projects.length;

    } else if (intent === 'get_project') {
      // Get specific project by name
      console.log(`📁 Finding project "${projectName}"...`);
      const project = await asanaClient.findProjectByName(teamGid, projectName);
      if (project) {
        stats.targetProject = project;
        stats.tasks = await asanaClient.getProjectTasksPaginated(project.gid, {
          taskStatus,
          assignee,
          limit: 50
        });
        stats.totalTasks = stats.tasks.length;
        stats.completedTasks = stats.tasks.filter(t => t.completed).length;
        // Get recent comments from this project
        stats.recentComments = await asanaClient.getRecentComments(stats.tasks.slice(0, 15));
      } else {
        stats.projectNotFound = projectName;
        // Still get list of available projects
        stats.allProjects = await asanaClient.getAllTeamProjects(teamGid);
      }

    } else if (intent === 'get_section') {
      // Get tasks and conversations from a specific board section
      console.log(`📑 Getting section "${sectionName}"...`);
      const progressProject = await asanaClient.getTeamProgressProject(teamGid);
      if (progressProject) {
        const sectionData = await asanaClient.getSectionByName(progressProject.gid, sectionName);
        if (sectionData.found) {
          let filteredTasks = sectionData.tasks;

          // Filter by specific task name if provided
          if (taskName) {
            console.log(`📋 Filtering section for task "${taskName}"...`);
            const taskNameLower = taskName.toLowerCase();
            filteredTasks = filteredTasks.filter(t =>
              t.name.toLowerCase().includes(taskNameLower) ||
              taskNameLower.includes(t.name.toLowerCase())
            );
          }

          // Filter comments by specific date if provided
          if (specificDate) {
            console.log(`📅 Filtering comments for date ${specificDate}...`);
            const targetDate = new Date(specificDate);
            filteredTasks = filteredTasks.map(task => ({
              ...task,
              comments: task.comments.filter(c => {
                const commentDate = new Date(c.date);
                return (
                  commentDate.getFullYear() === targetDate.getFullYear() &&
                  commentDate.getMonth() === targetDate.getMonth() &&
                  commentDate.getDate() === targetDate.getDate()
                );
              }),
              commentCount: undefined // Will be recalculated
            })).map(task => ({
              ...task,
              commentCount: task.comments.length
            }));
            // Remove tasks with no comments after date filter
            filteredTasks = filteredTasks.filter(t => t.commentCount > 0);
          }

          stats.targetSection = { ...sectionData, tasks: filteredTasks };
          stats.sectionName = sectionData.sectionName;
          stats.sectionTasks = filteredTasks;
          stats.sectionTaskCount = filteredTasks.length;
          stats.sectionTotalComments = filteredTasks.reduce((sum, t) => sum + t.commentCount, 0);

          // If filtering resulted in no results, note that
          if (filteredTasks.length === 0) {
            if (taskName && specificDate) {
              stats.noResultsMessage = `No comments found for task "${taskName}" on ${specificDate} in section "${sectionData.sectionName}"`;
            } else if (taskName) {
              stats.noResultsMessage = `Task "${taskName}" not found in section "${sectionData.sectionName}"`;
            } else if (specificDate) {
              stats.noResultsMessage = `No comments found on ${specificDate} in section "${sectionData.sectionName}"`;
            }
          }
        } else {
          stats.sectionNotFound = sectionName;
          stats.availableSections = sectionData.availableSections;
        }
      } else {
        stats.noProgressProject = true;
      }

    } else if (intent === 'get_board') {
      // Get full board structure with all sections
      console.log(`📊 Getting full board structure...`);
      const progressProject = await asanaClient.getTeamProgressProject(teamGid);
      if (progressProject) {
        stats.targetProject = progressProject;
        stats.boardStructure = await asanaClient.getBoardStructure(progressProject.gid);
      } else {
        stats.noProgressProject = true;
      }

    } else if (intent === 'get_task') {
      // Get specific task by name
      console.log(`📋 Finding task "${taskName}"...`);
      const task = await asanaClient.findTaskByName(teamGid, taskName, null);
      if (task) {
        stats.targetTask = task;
        // Get task comments
        const stories = await asanaClient.getTaskStories(task.gid);
        stats.targetTaskComments = stories
          .filter(s => s.type === 'comment' && s.text)
          .map(c => ({
            text: c.text,
            date: c.created_at,
            author: c.created_by?.name || 'Unknown'
          }));
        // Get attachments
        stats.targetTaskAttachments = await asanaClient.getTaskAttachments(task.gid);
        // Get subtasks
        stats.targetTaskSubtasks = await asanaClient.getSubtasks(task.gid);
      } else {
        stats.taskNotFound = taskName;
      }

    } else if (intent === 'get_comment') {
      // Get specific comment(s), possibly filtered by date
      console.log(`💬 Finding comments...`);
      if (taskName) {
        // Find task first, then get its comments
        const task = await asanaClient.findTaskByName(teamGid, taskName, null);
        if (task) {
          stats.targetTask = task;
          const stories = await asanaClient.getTaskStories(task.gid);
          let comments = stories
            .filter(s => s.type === 'comment' && s.text)
            .map(c => ({
              text: c.text,
              date: c.created_at,
              author: c.created_by?.name || 'Unknown'
            }));

          // Filter by date if specified
          if (specificDate) {
            const targetDate = new Date(specificDate);
            comments = comments.filter(c => {
              const commentDate = new Date(c.date);
              return (
                commentDate.getFullYear() === targetDate.getFullYear() &&
                commentDate.getMonth() === targetDate.getMonth() &&
                commentDate.getDate() === targetDate.getDate()
              );
            });
          }
          stats.targetTaskComments = comments;
        } else {
          stats.taskNotFound = taskName;
        }
      } else if (specificDate) {
        // Search comments by date across all projects
        stats.targetComments = await asanaClient.searchCommentsByDate(teamGid, specificDate);
      }

    } else if (intent === 'get_conversation') {
      // Get all recent conversations/comments
      console.log('💬 Fetching all conversations...');
      let conversations = await asanaClient.getAllConversations(teamGid, {
        projectGid: projectName ? (await asanaClient.findProjectByName(teamGid, projectName))?.gid : null,
        timeRange: timeRange,
        limit: 30
      });

      // Filter by comment author if specified (e.g., "Jamie Mills' comments on Lee Wane")
      if (commentAuthor && conversations && conversations.length > 0) {
        console.log(`🔍 Filtering comments by author: ${commentAuthor}`);
        const authorLower = commentAuthor.toLowerCase();
        conversations = conversations.filter(conv => {
          const convAuthor = (conv.author || '').toLowerCase();
          return convAuthor.includes(authorLower) || authorLower.includes(convAuthor.split(' ')[0]);
        });
        console.log(`📝 Found ${conversations.length} comments from ${commentAuthor}`);
      }

      stats.conversations = conversations;

    } else if (intent === 'search_tasks') {
      // Search tasks by keywords
      console.log(`🔍 Searching tasks for keywords...`);
      if (searchKeywords && searchKeywords.length > 0) {
        stats.searchResults = await asanaClient.searchTasksByKeywords(teamGid, searchKeywords, {
          taskStatus,
          assignee,
          limit: 20
        });
      }

    } else if (intent === 'list_tasks') {
      // List tasks with filters
      console.log(`📋 Listing tasks...`);
      let targetProjectGid = null;
      if (projectName) {
        const project = await asanaClient.findProjectByName(teamGid, projectName);
        if (project) {
          targetProjectGid = project.gid;
          stats.targetProject = project;
        }
      }

      if (targetProjectGid) {
        stats.tasks = await asanaClient.getProjectTasksPaginated(targetProjectGid, {
          taskStatus,
          assignee,
          limit: 100
        });
      } else {
        // Search across all projects
        const allProjects = await asanaClient.getAllTeamProjects(teamGid);
        let allTasks = [];
        for (const project of allProjects.slice(0, 5)) {
          const tasks = await asanaClient.getProjectTasksPaginated(project.gid, {
            taskStatus,
            assignee,
            limit: 30
          });
          allTasks = allTasks.concat(tasks.map(t => ({ ...t, projectName: project.name })));
        }
        stats.tasks = allTasks;
      }

      stats.totalTasks = stats.tasks?.length || 0;
      stats.completedTasks = stats.tasks?.filter(t => t.completed).length || 0;
      stats.overdueTasks = stats.tasks?.filter(t => !t.completed && t.due_on && new Date(t.due_on) < new Date()).length || 0;

    } else if (intent === 'create_task' && actionData) {
      // Create a new task
      console.log('➕ Creating task...');
      const progressProject = await asanaClient.getTeamProgressProject(teamGid);
      if (progressProject && actionData.name) {
        const newTask = await asanaClient.createTask(progressProject.gid, actionData);
        stats.createdTask = newTask;
        stats.actionSuccess = true;
      } else {
        stats.actionError = 'Could not create task - missing project or task name';
      }

    } else if (intent === 'add_comment' && actionData) {
      // Add a comment to a task
      console.log('💬 Adding comment...');
      if (taskName) {
        const task = await asanaClient.findTaskByName(teamGid, taskName, null);
        if (task && actionData.text) {
          const comment = await asanaClient.addComment(task.gid, actionData.text);
          stats.addedComment = comment;
          stats.actionSuccess = true;
          stats.targetTask = task;
        } else {
          stats.actionError = task ? 'Missing comment text' : `Task "${taskName}" not found`;
        }
      } else {
        stats.actionError = 'Please specify which task to add the comment to';
      }

    } else if (intent === 'update_task' && actionData) {
      // Update a task
      console.log('✏️ Updating task...');
      if (taskName) {
        const task = await asanaClient.findTaskByName(teamGid, taskName, null);
        if (task) {
          const updatedTask = await asanaClient.updateTask(task.gid, actionData);
          stats.updatedTask = updatedTask;
          stats.actionSuccess = true;
        } else {
          stats.actionError = `Task "${taskName}" not found`;
        }
      } else {
        stats.actionError = 'Please specify which task to update';
      }

    } else if (intent === 'get_attachments') {
      // Get attachments from a task
      console.log('📎 Fetching attachments...');
      if (taskName) {
        const task = await asanaClient.findTaskByName(teamGid, taskName, null);
        if (task) {
          stats.targetTask = task;
          stats.attachments = await asanaClient.getTaskAttachments(task.gid);
        } else {
          stats.taskNotFound = taskName;
        }
      }

    } else {
      // Default: status - comprehensive data retrieval
      console.log('📊 Fetching comprehensive status data...');

      // Use new comprehensive method if specific task/project/date is requested
      if (taskName || projectName || specificDate || searchKeywords) {
        const comprehensiveData = await asanaClient.getComprehensiveClientData(teamGid, {
          projectName,
          taskName,
          specificDate,
          timeRange,
          searchKeywords,
          taskStatus,
          assignee
        });

        stats = { ...stats, ...comprehensiveData };
      } else {
        // Standard status check - Progress project only
        const progressProject = await asanaClient.getTeamProgressProject(teamGid);

        if (!progressProject) {
          return res.json({
            response: `I found the client "${clientName_matched}", but they don't have a Progress project yet.`
          });
        }

        const projectId = progressProject.gid;
        const projectStats = await asanaClient.getProjectStats(projectId, timeRange);
        stats = { ...stats, ...projectStats };

        // Search for meetings
        const meetingTranscripts = await asanaClient.getMeetingTranscripts(teamGid, null, projectId);
        if (meetingTranscripts.found) {
          stats.meetingTranscripts = meetingTranscripts;
        }
      }
    }

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

    // Generate conversational coaching response
    console.log('🎯 Generating coaching response...');
    const responseText = await coachingGenerator.generateResponse(
      message,
      clientName_matched,
      stats,
      conversationHistory
    );
    console.log('✅ Response ready');

    // Save conversation to Supabase or in-memory
    if (supabase.isConnected()) {
      await supabase.saveConversationTurn(sid, message, responseText, clientName_matched);
      console.log('💾 Conversation saved to Supabase');
    } else {
      session.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: responseText }
      );
      session.currentClient = clientName_matched;
      console.log('💾 Conversation saved to memory');
    }

    console.log('💾 Session updated:', {
      currentClient: clientName_matched,
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

    // Start Express server (bind to 0.0.0.0 for Railway/Docker compatibility)
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
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
