const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const TrainingService = require('./services/training-service');

// Load environment variables
dotenv.config();

// Training service for knowledge base queries
const trainingService = new TrainingService();

// Keyword-to-training mapping for automatic advice
const STRUGGLE_KEYWORDS = {
  // Financial struggles → Profit First training
  profit: ['profit first', 'cash flow', 'financial management'],
  'cash flow': ['profit first', 'cash flow', 'financial management'],
  'p&l': ['profit first', 'P&L tracking', 'financial reporting'],
  money: ['profit first', 'cash flow', 'pricing'],
  pricing: ['profit first', 'pricing strategy', 'margins'],
  margins: ['profit first', 'margins', 'profitability'],

  // Bottleneck/process struggles → Systems training
  bottleneck: ['systems', 'processes', 'workflow optimization'],
  stuck: ['bottleneck', 'process improvement', 'efficiency'],
  delayed: ['delivery', 'project management', 'on time'],
  overwhelmed: ['time management', 'delegation', 'VA hiring'],
  busy: ['time freedom', 'delegation', 'systems'],

  // Marketing/Sales struggles
  leads: ['lead generation', 'marketing', 'fill your funnel'],
  marketing: ['marketing', 'brand building', 'social media'],
  sales: ['sales mastery', 'closing', 'proposals'],
  'no work': ['lead generation', 'marketing', 'outbound'],
  quiet: ['lead generation', 'marketing', 'pipeline'],

  // Team/Hiring struggles → Scale training
  hiring: ['hiring', 'VA', 'team building'],
  staff: ['team', 'hiring', 'super teams'],
  va: ['VA hiring', 'virtual assistant', 'delegation'],
  delegation: ['delegation', 'handoff', 'team'],
  team: ['super teams', 'team building', 'leadership'],

  // Time struggles
  time: ['time tracking', 'time freedom', 'efficiency'],
  'no time': ['time freedom', 'delegation', 'VA']
};

class CoachingResponseGenerator {
  constructor() {
    // Validate API key exists
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    if (apiKey === 'your-openai-api-key' || apiKey.startsWith('your-')) {
      throw new Error('OPENAI_API_KEY appears to be a placeholder. Please set a valid API key in .env file');
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY format is invalid. Should start with "sk-"');
    }

    console.log('✅ Coaching Generator OpenAI API key validated');

    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Detect struggle keywords in client data to auto-fetch relevant training
   * Scans comments, task names, and notes for keywords that indicate struggles
   */
  detectStruggles(clientData) {
    const foundStruggles = new Set();
    const textToScan = [];

    // Collect all text from client data
    if (clientData.conversations) {
      clientData.conversations.forEach(c => {
        if (c.text) textToScan.push(c.text.toLowerCase());
      });
    }
    if (clientData.recentComments) {
      clientData.recentComments.forEach(item => {
        item.comments?.forEach(c => {
          if (c.text) textToScan.push(c.text.toLowerCase());
        });
      });
    }
    if (clientData.tasks) {
      clientData.tasks.forEach(t => {
        if (t.name) textToScan.push(t.name.toLowerCase());
        if (t.notes) textToScan.push(t.notes.toLowerCase());
      });
    }
    if (clientData.targetTask) {
      if (clientData.targetTask.name) textToScan.push(clientData.targetTask.name.toLowerCase());
      if (clientData.targetTask.notes) textToScan.push(clientData.targetTask.notes.toLowerCase());
    }
    if (clientData.targetTaskComments) {
      clientData.targetTaskComments.forEach(c => {
        if (c.text) textToScan.push(c.text.toLowerCase());
      });
    }

    // Scan for struggle keywords
    const allText = textToScan.join(' ');
    for (const [keyword, searchTerms] of Object.entries(STRUGGLE_KEYWORDS)) {
      if (allText.includes(keyword)) {
        searchTerms.forEach(term => foundStruggles.add(term));
      }
    }

    return Array.from(foundStruggles);
  }

  /**
   * Detect if query is explicitly asking about training/how-to content
   */
  isExplicitTrainingQuery(question) {
    const trainingIndicators = [
      'how do i', 'how to', 'what is the process', 'what are the steps',
      'checklist', 'procedure', 'training', 'onboarding',
      'best practice', 'how should i', 'what should i do',
      'what is profit first', 'explain', 'teach me'
    ];
    const q = question.toLowerCase();
    return trainingIndicators.some(ind => q.includes(ind));
  }

  async generateResponse(userQuestion, clientName, projectStats, conversationHistory = []) {
    try {
      const systemPrompt = this.buildCoachingPersona();
      const dataContext = this.formatProjectDataForAI(clientName, projectStats);

      // TRAINING KNOWLEDGE - Two paths:
      // 1. Explicit training query ("how do I implement profit first?")
      // 2. Auto-detect struggles from client data and fetch relevant training
      let trainingContext = '';
      let detectedStruggles = [];

      // Path 1: Explicit training question (detected by server or by method)
      const isTrainingQuery = projectStats.isTrainingQuery || this.isExplicitTrainingQuery(userQuestion);
      const trainingQuestion = projectStats.trainingQuestion || userQuestion;

      if (isTrainingQuery) {
        console.log('📚 Training query detected, searching knowledge base...');
        const trainingResult = await trainingService.search(trainingQuestion);
        if (trainingResult.success && trainingResult.chunks.length > 0) {
          trainingContext = '\n\n--- TRAINING KNOWLEDGE (for your coaching advice) ---\n' +
            trainingResult.chunks.map(c => `[From: ${c.filename}]\n${c.content}`).join('\n\n---\n\n');
          console.log(`📚 Found ${trainingResult.chunks.length} relevant training chunks`);
        }
      }

      // Path 2: Auto-detect struggles from client data
      if (!trainingContext && projectStats) {
        detectedStruggles = this.detectStruggles(projectStats);
        if (detectedStruggles.length > 0) {
          console.log(`🔍 Detected client struggles: ${detectedStruggles.join(', ')}`);

          // Search training for the top 2-3 struggle areas
          const searchQuery = detectedStruggles.slice(0, 3).join(' ');
          console.log(`📚 Auto-fetching training for: "${searchQuery}"`);

          const trainingResult = await trainingService.search(searchQuery);
          if (trainingResult.success && trainingResult.chunks.length > 0) {
            trainingContext = '\n\n--- COACHING ADVICE (from Develop training) ---\n' +
              `Based on what I see in ${clientName}'s data, here's relevant coaching guidance:\n\n` +
              trainingResult.chunks.slice(0, 3).map(c => `[${c.filename}]\n${c.content}`).join('\n\n---\n\n');
            console.log(`📚 Auto-loaded ${trainingResult.chunks.length} training chunks for struggles`);
          }
        }
      }

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'system',
          content: `Here is the current data for ${clientName}:\n\n${dataContext}${trainingContext}`,
        },
      ];

      // Add conversation history (last 5 messages for context)
      const recentHistory = conversationHistory.slice(-5);
      messages.push(...recentHistory);

      // Add current question
      messages.push({
        role: 'user',
        content: userQuestion,
      });

      console.log('🎯 Generating coaching response for:', userQuestion);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.5, // Balanced for natural but accurate responses
      });

      const coachingResponse = response.choices[0].message.content;
      console.log('✅ Coaching response generated');

      return coachingResponse;
    } catch (error) {
      console.error('❌ Error generating coaching response:', error);
      return `I had trouble processing that question. Could you rephrase it? (Error: ${error.message})`;
    }
  }

  /**
   * Builds the coaching persona system prompt with concise, action-oriented format
   */
  buildCoachingPersona() {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return `You are an AI assistant for construction business coaches at Develop Coaching.

TODAY'S DATE: ${todayStr}

CONTEXT:
Coaches use this system to quickly catch up on their clients before calls or check-ins. They manage 60+ clients and can't remember every conversation. You are their memory - instantly telling them what's been happening with a client.

THE DATA YOU'RE SEEING:
Below are Asana comments between coaches and the client from the past 2 months. Comments are how coaches and clients communicate - discussing tasks, progress, blockers, and next steps. Think of them as a conversation thread.

COACHES IN THIS SYSTEM:
- Greg Wilkes (Lead Coach)
- Nick Tobing
- Harmeet Johal
- Jamie Mills

WHAT COACHES TYPICALLY ASK:
- "What's the latest?" → Show the most recent comment/update
- "What did Greg say?" → Filter to that coach's comments only
- "What are the roadblocks?" → Identify blockers or stuck tasks mentioned
- "What should I follow up on?" → Spot tasks that need attention or went quiet

HOW TO RESPOND:
- Be concise - coaches are busy, give them the key info fast
- Quote actual comments when relevant - don't paraphrase loosely
- Include dates so they know how recent things are
- If asked about a specific coach and there are none from them, say so clearly
- Highlight anything that looks like it needs follow-up

TRAINING KNOWLEDGE & COACHING ADVICE:
When the data includes "TRAINING KNOWLEDGE" or "COACHING ADVICE" sections:
- This is content from Develop Coaching's training library (Profit First, Sales Mastery, etc.)
- USE this to give proactive coaching advice to the coach asking
- Connect the training to the client's specific situation
- Example: If client mentions "cash flow problems" and training shows Profit First methodology, advise:
  "Based on what I'm seeing with [Client], they could benefit from implementing Profit First. The key steps are..."
- Reference the source naturally: "In our Profit First training, we cover..."
- When struggles are detected automatically, proactively suggest relevant training concepts
- You ARE Greg - speak with authority about the training content as if you taught it

CRITICAL RULES:
- ONLY reference data that appears below - never invent information
- If asked about financial data and none is provided, say "I don't have P&L data for this client"
- When writing messages, sign off as "Greg" (never "[Your Name]")
- If no comments match what user asked for, be honest and offer alternatives

RESPONSE FORMATS:

For "latest message/conversation":
[Date] [Author] on "[Task Name]":
"[Exact quote from comment]"

For "write a message":
Hi [Client],
[Reference recent conversation]
[Address their situation]
[Clear next step or question]
Best regards,
Greg`;
  }

  /**
   * Formats project statistics into a readable context for the AI
   * Now handles comprehensive data from advanced retrieval
   */
  formatProjectDataForAI(clientName, stats) {
    let context = '';

    // Show intent for context
    if (stats.intent) {
      context += `**Query Type:** ${stats.intent}\n\n`;
    }

    // IMPORTANT: If user asked for a specific author's comments, tell the LLM
    if (stats.commentAuthorFilter) {
      context += `**⚠️ AUTHOR FILTER REQUESTED:** The user specifically asked for comments from "${stats.commentAuthorFilter}". From the comments below, ONLY show/discuss comments where the author name contains "${stats.commentAuthorFilter}" (case-insensitive). If no comments match, say "I didn't find any comments from ${stats.commentAuthorFilter} in the data."\n\n`;
    }

    // ============================================================
    // MULTI-CLIENT RESULTS - Handle queries about multiple clients
    // ============================================================
    if (stats.isMultiClient && stats.multiClientResults && stats.multiClientResults.length > 0) {
      context += `**MULTI-CLIENT QUERY RESULTS (${stats.multiClientResults.length} clients requested):**\n\n`;

      for (const clientResult of stats.multiClientResults) {
        context += `------- ${clientResult.clientName} -------\n`;

        if (!clientResult.found) {
          context += `⚠️ ${clientResult.error || 'Client not found'}\n\n`;
          continue;
        }

        // Show conversations for this client
        if (clientResult.conversations && clientResult.conversations.length > 0) {
          context += `**Recent Conversations (${clientResult.conversations.length}):**\n`;
          clientResult.conversations.slice(0, 5).forEach(c => {
            const date = new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            context += `[${date}] Task: "${c.taskName}" (${c.projectName})\n`;
            context += `**${c.author}**: ${c.text}\n\n`;
          });
        } else if (clientResult.latestConversation) {
          const c = clientResult.latestConversation;
          const date = new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          context += `**Latest Conversation:**\n`;
          context += `[${date}] Task: "${c.taskName}" (${c.projectName})\n`;
          context += `**${c.author}**: ${c.text}\n\n`;
        } else {
          context += `No recent conversations found.\n\n`;
        }
      }

      // Return early for multi-client - we've already formatted the data
      return context;
    }

    // ============================================================
    // SINGLE CLIENT - Standard formatting
    // ============================================================
    context += `**${clientName} - Data Retrieved**\n\n`;

    // Include P&L financial data if available
    if (stats.plData) {
      context += `**FINANCIAL DATA (from P&L Tracker):**\n`;
      context += stats.plData;
      context += `\n---\n\n`;
    }

    // ============================================================
    // Handle different data types based on what's in stats
    // ============================================================

    // ACTION RESULTS - show confirmation of actions taken
    if (stats.actionSuccess) {
      if (stats.createdTask) {
        context += `**✅ TASK CREATED SUCCESSFULLY:**\n`;
        context += `- Name: ${stats.createdTask.name}\n`;
        context += `- ID: ${stats.createdTask.gid}\n\n`;
      }
      if (stats.addedComment) {
        context += `**✅ COMMENT ADDED SUCCESSFULLY:**\n`;
        context += `- Added to task: ${stats.targetTask?.name || 'Unknown'}\n\n`;
      }
      if (stats.updatedTask) {
        context += `**✅ TASK UPDATED SUCCESSFULLY:**\n`;
        context += `- Task: ${stats.updatedTask.name}\n\n`;
      }
    }

    if (stats.actionError) {
      context += `**❌ ACTION ERROR:** ${stats.actionError}\n\n`;
    }

    // LIST OF ALL PROJECTS for this client
    if (stats.allProjects && stats.allProjects.length > 0) {
      context += `**ALL PROJECTS FOR ${clientName} (${stats.allProjects.length} total):**\n`;
      stats.allProjects.forEach((project, idx) => {
        context += `${idx + 1}. ${project.name}\n`;
      });
      context += '\n';
    }

    // TARGET PROJECT (specific project requested)
    if (stats.targetProject) {
      context += `**TARGET PROJECT: ${stats.targetProject.name}**\n`;
      if (stats.totalTasks !== undefined) {
        context += `- Total tasks: ${stats.totalTasks}\n`;
        context += `- Completed: ${stats.completedTasks || 0}\n`;
      }
      context += '\n';
    }

    // BOARD STRUCTURE (get_board intent)
    if (stats.boardStructure && stats.boardStructure.length > 0) {
      context += `**PROGRESS BOARD STRUCTURE:**\n\n`;
      for (const section of stats.boardStructure) {
        context += `**${section.sectionName}** (${section.taskCount} tasks):\n`;
        section.tasks.forEach((task, idx) => {
          const status = task.completed ? '✅' : '⬜';
          const comments = task.commentCount > 0 ? ` (${task.commentCount} 💬)` : '';
          context += `  ${idx + 1}. ${status} ${task.name}${comments}\n`;
          if (task.latestComment) {
            const date = new Date(task.latestComment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            context += `      └─ Latest [${date}] ${task.latestComment.author}: "${task.latestComment.text.substring(0, 80)}${task.latestComment.text.length > 80 ? '...' : ''}"\n`;
          }
        });
        context += '\n';
      }
    }

    // SECTION DATA (get_section intent)
    if (stats.targetSection) {
      context += `**SECTION: ${stats.sectionName}** (${stats.sectionTaskCount} tasks, ${stats.sectionTotalComments} total comments)\n\n`;
      stats.sectionTasks.forEach((task, idx) => {
        const status = task.completed ? '✅' : '⬜';
        context += `**${idx + 1}. ${status} ${task.name}** (${task.commentCount} comments)\n`;
        if (task.comments && task.comments.length > 0) {
          context += `Recent conversations:\n`;
          task.comments.slice(0, 3).forEach(c => {
            const date = new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            context += `  [${date}] **${c.author}**: ${c.text}\n`;
          });
          if (task.comments.length > 3) {
            context += `  ... and ${task.comments.length - 3} more comments\n`;
          }
        }
        context += '\n';
      });
    }

    if (stats.sectionNotFound) {
      context += `**⚠️ SECTION NOT FOUND:** Could not find section "${stats.sectionNotFound}"\n`;
      if (stats.availableSections && stats.availableSections.length > 0) {
        context += `Available sections: ${stats.availableSections.join(', ')}\n`;
      }
      context += '\n';
    }

    if (stats.noResultsMessage) {
      context += `**ℹ️ NO RESULTS:** ${stats.noResultsMessage}\n\n`;
    }

    if (stats.projectNotFound) {
      context += `**⚠️ PROJECT NOT FOUND:** Could not find project "${stats.projectNotFound}"\n`;
      if (stats.allProjects) {
        context += `Available projects: ${stats.allProjects.map(p => p.name).join(', ')}\n`;
      }
      context += '\n';
    }

    // TARGET TASK (specific task requested)
    if (stats.targetTask) {
      context += `**TARGET TASK FOUND:**\n`;
      context += `- Name: ${stats.targetTask.name}\n`;
      context += `- Status: ${stats.targetTask.completed ? 'Completed' : 'Open'}\n`;
      if (stats.targetTask.due_on) {
        context += `- Due: ${stats.targetTask.due_on}\n`;
      }
      if (stats.targetTask.assignee?.name) {
        context += `- Assignee: ${stats.targetTask.assignee.name}\n`;
      }
      if (stats.targetTask.notes) {
        context += `- Description: ${stats.targetTask.notes.substring(0, 500)}\n`;
      }
      context += '\n';

      // Task subtasks
      if (stats.targetTaskSubtasks && stats.targetTaskSubtasks.length > 0) {
        context += `**Subtasks (${stats.targetTaskSubtasks.length}):**\n`;
        stats.targetTaskSubtasks.forEach((st, idx) => {
          context += `  ${idx + 1}. ${st.completed ? '✅' : '⬜'} ${st.name}\n`;
        });
        context += '\n';
      } else if (stats.targetTask.subtasks && stats.targetTask.subtasks.length > 0) {
        context += `**Subtasks (${stats.targetTask.subtasks.length}):**\n`;
        stats.targetTask.subtasks.forEach((st, idx) => {
          context += `  ${idx + 1}. ${st.completed ? '✅' : '⬜'} ${st.name}\n`;
        });
        context += '\n';
      }

      // Task attachments
      if (stats.targetTaskAttachments && stats.targetTaskAttachments.length > 0) {
        context += `**Attachments (${stats.targetTaskAttachments.length}):**\n`;
        stats.targetTaskAttachments.forEach((att, idx) => {
          context += `  ${idx + 1}. 📎 ${att.name}\n`;
        });
        context += '\n';
      } else if (stats.targetTask.attachments && stats.targetTask.attachments.length > 0) {
        context += `**Attachments (${stats.targetTask.attachments.length}):**\n`;
        stats.targetTask.attachments.forEach((att, idx) => {
          context += `  ${idx + 1}. 📎 ${att.name}\n`;
        });
        context += '\n';
      }
    }

    if (stats.taskNotFound) {
      context += `**⚠️ TASK NOT FOUND:** Could not find task "${stats.taskNotFound}"\n\n`;
    }

    // TARGET TASK COMMENTS (from specific task or date search)
    if (stats.targetTaskComments && stats.targetTaskComments.length > 0) {
      context += `**COMMENTS FROM TASK "${stats.targetTask?.name || 'Task'}" (${stats.targetTaskComments.length} found):**\n`;
      stats.targetTaskComments.forEach(c => {
        const date = new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        context += `[${date}] **${c.author}**: ${c.text}\n`;
      });
      context += '\n';
    }

    // TARGET COMMENTS (from date-based search across projects)
    if (stats.targetComments && stats.targetComments.length > 0) {
      context += `**COMMENTS FOUND (${stats.targetComments.length}):**\n`;
      stats.targetComments.forEach(item => {
        const date = new Date(item.comment?.date || item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const author = item.comment?.author || item.author || 'Unknown';
        const text = item.comment?.text || item.text;
        const taskName = item.taskName || 'Unknown task';
        context += `--- Task: "${taskName}" ---\n`;
        context += `[${date}] **${author}**: ${text}\n\n`;
      });
    }

    // ALL CONVERSATIONS (get_conversation intent)
    // SIMPLIFIED: Show comments directly, grouped by task
    if (stats.conversations && stats.conversations.length > 0) {
      context += `**RECENT COMMENTS (${stats.conversations.length} total, past 2 months):**\n\n`;

      // Group comments by task
      const taskGroups = new Map();
      for (const c of stats.conversations) {
        const key = c.taskGid || c.taskName;
        if (!taskGroups.has(key)) {
          taskGroups.set(key, {
            taskName: c.taskName,
            sectionName: c.sectionName,
            projectName: c.projectName,
            comments: []
          });
        }
        taskGroups.get(key).comments.push({
          date: c.date,
          author: c.author,
          text: c.text
        });
      }

      // Display each task with its comments
      for (const [key, taskData] of taskGroups) {
        const location = taskData.sectionName
          ? `${taskData.sectionName} > ${taskData.taskName}`
          : taskData.taskName;

        context += `📌 **${location}**\n`;

        // Show comments for this task
        for (const comment of taskData.comments.slice(0, 5)) {
          const date = new Date(comment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          context += `[${date}] ${comment.author}: "${comment.text}"\n`;
        }
        context += `\n`;
      }
    }

    // SEARCH RESULTS (search_tasks intent)
    if (stats.searchResults && stats.searchResults.length > 0) {
      context += `**SEARCH RESULTS (${stats.searchResults.length} tasks found):**\n`;
      stats.searchResults.forEach((task, idx) => {
        const status = task.completed ? '✅' : '⬜';
        context += `${idx + 1}. ${status} ${task.name}`;
        if (task.projectName) context += ` (${task.projectName})`;
        context += '\n';
        if (task.notes) {
          context += `   Notes: ${task.notes.substring(0, 200)}...\n`;
        }
      });
      context += '\n';
    }

    // ATTACHMENTS (get_attachments intent)
    if (stats.attachments && stats.attachments.length > 0) {
      context += `**ATTACHMENTS FOUND (${stats.attachments.length}):**\n`;
      stats.attachments.forEach((att, idx) => {
        const date = att.created_at ? new Date(att.created_at).toLocaleDateString() : 'Unknown date';
        context += `${idx + 1}. 📎 ${att.name} (${date})\n`;
      });
      context += '\n';
    }

    // STANDARD STATS (from default status flow)
    if (stats.totalTasks !== undefined && !stats.targetProject && !stats.allProjects) {
      context += `**Overall Progress:**\n`;
      context += `- Total tasks: ${stats.totalTasks}\n`;
      context += `- Completed: ${stats.completedTasks || 0} (${stats.completionPercentage || 0}%)\n`;
      context += `- Overdue: ${stats.overdueTasks || 0} tasks\n`;
      if (stats.openTasks) {
        context += `- Open/pending: ${stats.openTasks.length} tasks\n`;
      }
      context += '\n';
    }

    // TASKS LIST (list_tasks intent or from comprehensive data)
    if (stats.tasks && stats.tasks.length > 0 && !stats.searchResults) {
      context += `**TASKS (${stats.tasks.length} total):**\n`;
      stats.tasks.slice(0, 20).forEach((task, idx) => {
        const status = task.completed ? '✅' : (task.due_on && new Date(task.due_on) < new Date() ? '⚠️ OVERDUE' : '⬜');
        context += `${idx + 1}. ${status} ${task.name}`;
        if (task.projectName) context += ` (${task.projectName})`;
        if (task.assignee?.name) context += ` [${task.assignee.name}]`;
        context += '\n';
      });
      if (stats.tasks.length > 20) {
        context += `... and ${stats.tasks.length - 20} more tasks\n`;
      }
      context += '\n';
    }

    // RECENT COMMENTS (legacy format from standard stats)
    if (stats.recentComments && stats.recentComments.length > 0 && !stats.conversations && !stats.targetTaskComments) {
      context += `**CONVERSATION HISTORY (Coach/Client Comments - Most Recent First):**\n`;
      context += `The author name is shown before each comment - this tells you who said what (coach vs client).\n\n`;
      stats.recentComments.forEach((item, idx) => {
        context += `--- TASK: "${item.taskName}" (${item.taskCompleted ? 'Completed' : 'Open'}) ---\n`;
        if (item.taskNotes) {
          context += `Task Description: ${item.taskNotes}\n`;
        }
        context += `Total comments on this task: ${item.totalComments}\n`;
        item.comments.forEach(c => {
          const date = new Date(c.date).toLocaleDateString();
          const author = c.author || 'Unknown';
          context += `[${date}] **${author}**: ${c.text}\n`;
        });
        context += '\n';
      });
      context += `---\n\n`;
    }

    // MEETING TRANSCRIPTS
    if (stats.meetingTranscripts) {
      if (stats.meetingTranscripts.found && stats.meetingTranscripts.transcripts.length > 0) {
        context += `**MEETING TRANSCRIPTS/NOTES FOUND:**\n`;
        stats.meetingTranscripts.transcripts.forEach((transcript, idx) => {
          const date = new Date(transcript.taskDate).toLocaleDateString();
          context += `--- ${transcript.taskName} (${date}) ---\n`;
          context += `Project: ${transcript.projectName}\n`;
          if (transcript.sectionName) {
            context += `Section: ${transcript.sectionName}\n`;
          }
          if (transcript.notes) {
            context += `Notes: ${transcript.notes}\n`;
          }
          if (transcript.comments && transcript.comments.length > 0) {
            context += `Comments:\n`;
            transcript.comments.forEach(c => {
              const cDate = new Date(c.date).toLocaleDateString();
              const author = c.author || 'Unknown';
              context += `[${cDate}] **${author}**: ${c.text}\n`;
            });
          }
          context += '\n';
        });
        context += `---\n\n`;
      }
    }

    // RECENT COMPLETIONS
    if (stats.recentCompletions && stats.recentCompletions.length > 0) {
      context += `**Recently Completed Tasks (last 7 days):**\n`;
      stats.recentCompletions.slice(0, 5).forEach((task, idx) => {
        context += `${idx + 1}. ${task.name}\n`;
      });
      context += '\n';
    }

    // OPEN TASKS (legacy format)
    if (stats.openTasks && stats.openTasks.length > 0 && !stats.tasks) {
      context += `**Open Tasks (${stats.openTasks.length} remaining):**\n`;
      stats.openTasks.slice(0, 10).forEach((task, idx) => {
        const status = task.due_on ?
          (new Date(task.due_on) < new Date() ? '[OVERDUE]' : '[Pending]') :
          '[Pending]';
        context += `${idx + 1}. ${status} ${task.name}\n`;
      });

      if (stats.openTasks.length > 10) {
        context += `... and ${stats.openTasks.length - 10} more tasks\n`;
      }
      context += '\n';
    }

    // If no data was added, note that
    if (context === `**${clientName} - Data Retrieved**\n\n` || context.trim().endsWith('**Query Type:** ' + stats.intent)) {
      context += `No specific data found for this query. The client exists but no matching data was retrieved.\n`;
    }

    return context;
  }
}

module.exports = CoachingResponseGenerator;
