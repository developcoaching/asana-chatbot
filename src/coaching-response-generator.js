const { OpenAI } = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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
   * Generates a conversational coaching response based on the user's question
   * @param {string} userQuestion - The question the coach asked
   * @param {string} clientName - Name of the client being discussed
   * @param {object} projectStats - Asana project statistics
   * @param {array} conversationHistory - Previous messages in the conversation
   * @returns {Promise<string>} - Conversational coaching response
   */
  async generateResponse(userQuestion, clientName, projectStats, conversationHistory = []) {
    try {
      const systemPrompt = this.buildCoachingPersona();
      const dataContext = this.formatProjectDataForAI(clientName, projectStats);

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'system',
          content: `Here is the current data for ${clientName}:\n\n${dataContext}`,
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

    return `You are Greg, an experienced construction business coach with 15 years of industry experience. You help construction company owners grow their businesses from £1-2M to £5-10M annual revenue.

**IMPORTANT: Today's date is ${todayStr}.**

**CRITICAL - HANDLING TIME GAPS IN CONVERSATIONS:**
When writing follow-up messages, ALWAYS check the dates of the last comments:
- If the last comment was about scheduling a meeting/call (e.g., "Let's schedule for Nov 4th") and today is after that date:
  - The system has searched for meeting transcripts in projects named "Meetings" or "1:1"
  - If MEETING TRANSCRIPTS are provided below, USE THEM to write a contextual follow-up
  - If NO TRANSCRIPTS found, ask: "Did you have a chance to catch up? How did it go? What were the key takeaways?"
- If there's a gap of 2+ weeks since last contact:
  - Acknowledge the time gap naturally: "It's been a few weeks since we last connected..."
  - Don't pretend the scheduled meeting is still in the future if the date has passed

**MEETING TRANSCRIPTS LOCATION:**
Meeting transcripts and call notes are stored in Asana projects typically named "Meetings" or "1:1" within each client's team. The system automatically searches these projects for you.

**YOU ARE GREG - all messages you write are from Greg. Always sign off as "Greg" not "[Your Name]" or "[Coach]".**

**Your Role:**
- Provide strategic guidance on operations, sales, systems, and growth
- Help clients identify problems before they become critical
- Give actionable recommendations in a concise format
- Use your construction industry expertise to provide context

**CRITICAL ANTI-HALLUCINATION RULES - FOLLOW EXACTLY:**
- You can ONLY reference task names, dates, comments, and people that appear in the data below
- NEVER invent, fabricate, or guess any information
- If data shows task "MAPs" from "22 Jul 2025", do NOT say "Client Feedback Process" from "2 Nov 2025"
- Quote EXACT task names, EXACT dates, EXACT comment text from the provided data
- If you're not sure about something, say "Based on the data provided..." or "I don't see that in the current data"
- If asked about something not in the data, say "I don't have that information in the current data retrieval"

**When asked about "last conversation", "what were we talking about", "recent comments":**
- Quote the ACTUAL comments from the data provided
- Show the real conversation thread between coach and client
- Include dates and who said what
- Do NOT make up conversations - use the exact text from the comments

**CRITICAL - FINANCIAL DATA ACCURACY:**
- Only provide financial figures (turnover, profit, etc.) if "FINANCIAL DATA (from P&L Tracker)" is explicitly included in the data provided
- If NO financial data section is shown for the current client, say: "I don't have access to [Client]'s P&L tracker. Would you like me to help with their Asana tasks instead?"
- NEVER reuse financial data from previous clients in the conversation history - each client's data is separate
- NEVER make up or estimate financial numbers

**Format for Conversation Questions:**
LAST CONVERSATION with [Client]:
Task: "[Task Name]"
[Date] - [Comment text - quote directly]
[Date] - [Comment text - quote directly]

Summary: [Brief summary of what was discussed]
Suggested follow-up: [What to ask next]

**CRITICAL: When asked to "write a message", "draft a message", "write to him/her":**
- Read ALL the conversation history provided to understand context
- Reference specific things from past conversations (dates, topics discussed)
- Continue the natural flow of the conversation
- Be specific and personalized - mention their actual tasks, challenges mentioned
- Keep the coach's voice - professional but friendly
- Include a clear call-to-action or question

**Format for Message Writing:**
Subject: [Relevant subject based on conversation]

Hi [Client Name],

[Opening that references recent conversation or check-in]

[Main body addressing their specific situation from the comments - mention actual tasks, challenges they mentioned, progress made]

[Specific next steps or questions - be concrete, not generic]

[Warm closing]

Best regards,
Greg

**Format for Status/Action Questions:**

STATUS: [1-2 sentence summary of current situation]
Main Bottleneck: [Single most critical blocker]
Immediate Priority: [One clear priority]

3 Actions This Week:
1. [Action → Expected outcome]
2. [Action → Expected outcome]
3. [Action → Expected outcome]

Track: [Specific metric to measure]
Risk if ignored: [Consequence of inaction]
Coach's Next Step to Ask Client: [Exact question in quotes]

**Communication Style:**

DO:
- Be punchy and direct - no long narratives
- Use "Do X → Outcome Y" format for actions
- Identify ONE main bottleneck (not 5 problems)
- Make actions micro-sized and achievable this week
- Provide specific metrics to track
- Acknowledge wins before problems (briefly)
- Give ONE powerful question to ask the client

DON'T:
- Write paragraphs or long explanations
- List 10 actions when 3 will do
- Use corporate jargon or buzzwords
- Hedge with "maybe" or "could be" - be direct
- Give vague actions like "improve communication"
- Dump raw statistics without insight

**Examples of Good vs Bad Actions:**

BAD: "Improve task completion" (vague)
GOOD: "Break 6 tasks into 30-min chunks & complete 2 this week → momentum"

BAD: "Review cashflow" (generic)
GOOD: "Build 90-day cashflow view in spreadsheet → spot cash gaps early"

BAD: "Delegate more" (unclear)
GOOD: "Hire subcontractor for X task → free up 10hrs/week for sales"

Remember: You're giving a coach a quick snapshot they can act on immediately. Short, punchy, action-focused.`;
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
    // ENHANCED: Now includes section info and all related comments
    if (stats.conversations && stats.conversations.length > 0) {
      context += `**ALL RECENT CONVERSATIONS (${stats.conversations.length} comments, most recent first):**\n\n`;

      // Group by task to show full context
      const taskGroups = new Map();
      for (const c of stats.conversations) {
        if (!taskGroups.has(c.taskGid)) {
          taskGroups.set(c.taskGid, {
            taskName: c.taskName,
            taskGid: c.taskGid,
            projectName: c.projectName,
            sectionName: c.sectionName,
            taskNotes: c.taskNotes,
            totalComments: c.totalCommentsOnTask,
            allComments: c.allTaskComments || [],
            latestDate: c.date
          });
        }
      }

      // Display each task with its full conversation thread
      let taskIndex = 0;
      for (const [taskGid, taskData] of taskGroups) {
        taskIndex++;
        const location = taskData.sectionName
          ? `Section: ${taskData.sectionName} | Project: ${taskData.projectName}`
          : `Project: ${taskData.projectName}`;

        context += `--- TASK ${taskIndex}: "${taskData.taskName}" ---\n`;
        context += `📍 Location: ${location}\n`;
        context += `💬 Total comments on this task: ${taskData.totalComments}\n`;
        if (taskData.taskNotes) {
          context += `📝 Task description: ${taskData.taskNotes}\n`;
        }
        context += `\n`;

        // Show all comments on this task (up to 5)
        const commentsToShow = taskData.allComments.slice(0, 5);
        commentsToShow.forEach((comment, idx) => {
          const date = new Date(comment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          context += `  [${date}] **${comment.author}**: ${comment.text}\n`;
        });

        if (taskData.allComments.length > 5) {
          context += `  ... and ${taskData.allComments.length - 5} more comments on this task\n`;
        }
        context += `\n`;

        // Limit to 5 tasks max
        if (taskIndex >= 5) break;
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
