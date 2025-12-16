const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables with override
dotenv.config({ override: true });

class OpenAIIntentExtractor {
  constructor() {
    // Read API key directly from .env file to avoid system env override
    let apiKey = process.env.OPENAI_API_KEY;

    // If still getting placeholder, read directly from .env file
    if (apiKey === 'your-openai-api-key' || apiKey?.startsWith('your-')) {
      try {
        const envPath = path.join(__dirname, '..', '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/OPENAI_API_KEY=(.+)/);
        if (match && match[1] && !match[1].startsWith('your-')) {
          apiKey = match[1].trim();
          process.env.OPENAI_API_KEY = apiKey; // Update process.env
        }
      } catch (e) {
        console.warn('Could not read .env file directly:', e.message);
      }
    }

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    if (apiKey === 'your-openai-api-key' || apiKey.startsWith('your-')) {
      throw new Error('OPENAI_API_KEY appears to be a placeholder. Please set a valid API key in .env file');
    }

    // Allow both sk- and sk-proj- prefixes
    if (!apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY format is invalid. Should start with "sk-"');
    }

    console.log('✅ OpenAI Intent Extractor initialized');

    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async extractIntent(userMessage, conversationHistory = [], currentClient = null) {
    try {
      // Build comprehensive system prompt for advanced extraction
      let systemPrompt = `You are an advanced intent extraction system for an Asana coaching assistant. Extract ALL relevant information from user queries.

**YOUR JOB:** Extract comprehensive information from queries to enable powerful Asana searches.

**EXTRACTION FIELDS:**

1. **clientNames** - Array of clients being discussed (IMPORTANT: can be multiple!):
   - Single client: ["Brad"] or ["John Eastwood"]
   - Multiple clients: ["Dale", "John", "Brad"] - when user asks about multiple people
   - If using pronouns (he/she/they) with context, use the context name
   - If no name and no context → ["unknown"]
   - ALWAYS return as an array, even for single client

2. **intent** - What they want to do:
   - "status" - General status check (default)
   - "get_task" - Find a specific task by name
   - "get_comment" - Find specific comment(s)
   - "get_conversation" - Show conversation history/comments
   - "search_tasks" - Search tasks by keyword
   - "list_tasks" - List tasks (completed, open, overdue, etc.)
   - "list_projects" - Show all projects for a client
   - "get_project" - Access a specific project by name
   - "get_section" - Get tasks/conversations from a board section (PLAN, ATTRACT, CONVERT, DELIVER, SCALE)
   - "get_board" - Show full board structure with all sections
   - "compare" - Compare multiple clients
   - "write_message" - Draft a message to client
   - "create_task" - Create a new task
   - "update_task" - Update/modify a task
   - "add_comment" - Add a comment to a task
   - "get_attachments" - Get file attachments

3. **taskName** - Specific task being referenced:
   - "Latest MAP", "Budget review", "P&L tracker"
   - Extract exact task name if mentioned
   - null if not mentioned

4. **projectName** - Specific project being referenced:
   - "Progress", "org chart", "MAPs", "Meetings", "1-1"
   - Extract exact project name if mentioned
   - null if not mentioned (will default to searching all projects)

5. **specificDate** - Exact date if mentioned:
   - IMPORTANT: Default to CURRENT YEAR (2025) unless user explicitly mentions a different year
   - "Oct 13", "October 13th", "13 October" → "2025-10-13" (use current year)
   - "yesterday" → calculate actual date from today
   - "Monday", "last Tuesday" → calculate actual date
   - "Dec 5" → "2025-12-05" (use current year)
   - Use ISO format: YYYY-MM-DD
   - null if not mentioned

6. **timeRange** - Relative time period:
   - "last week", "past week" → "last_week"
   - "last 2 weeks" → "last_2_weeks"
   - "last 3 weeks" → "last_3_weeks"
   - "last month", "last 4 weeks" → "last_month"
   - "last 2 months" → "last_2_months"
   - "last 3 months" → "last_3_months"
   - "yesterday" → "yesterday"
   - "today" → "today"
   - null if not mentioned

7. **searchKeywords** - Keywords to search for in tasks/comments:
   - "cashflow", "invoicing", "budget"
   - Extract key terms user wants to find
   - null if not a search query

8. **taskStatus** - Filter by task status:
   - "completed", "open", "overdue", "all"
   - null if not mentioned

9. **assignee** - Person assigned to tasks:
   - "Jamie", "Greg", "Sarah"
   - null if not mentioned

10. **actionData** - For write operations:
    - For create_task: { "name": "task name", "notes": "description" }
    - For add_comment: { "text": "comment text" }
    - For update_task: { "completed": true } or other fields
    - null if not a write operation

11. **sectionName** - Board section being referenced:
    - "PLAN", "ATTRACT", "CONVERT", "DELIVER", "SCALE"
    - "Right next thing" - Priority/next action tasks
    - "Meetings", "1-1 Meetings" - Meeting-related tasks
    - "Build & Scale Summit 2025", "Build & Scale Summmit 2025" - Summit tasks
    - "Boardroom" - Boardroom-related tasks
    - These are columns on the Progress board
    - IMPORTANT: Return the section name EXACTLY as user says it (e.g., "Right next thing" not "PLAN")
    - null if not mentioned

**TODAY'S DATE:** ${new Date().toISOString().split('T')[0]}

**BOARD SECTIONS:** The Progress project is organized as a board with these sections:
- PLAN: Planning tasks (MAPs, P&L Tracker, Roadmap, etc.)
- ATTRACT: Marketing/lead generation tasks
- CONVERT: Sales tasks (Sales mastery, Website, Estimates)
- DELIVER: Delivery/operations tasks (Software, Change orders)
- SCALE: Scaling/growth tasks
- Right next thing: Priority items, next actions, immediate tasks
- Meetings / 1-1 Meetings: Meeting notes and follow-ups
- Build & Scale Summit 2025: Summit-related tasks
- Boardroom: Boardroom tasks

**EXAMPLES:**

Query: "Pull up the latest comment from John Eastwood · 13 Oct Latest MAP"
→ {
  "clientNames": ["John Eastwood"],
  "intent": "get_comment",
  "taskName": "Latest MAP",
  "projectName": null,
  "specificDate": "2025-10-13",
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Check Rachel's org chart project"
→ {
  "clientNames": ["Rachel"],
  "intent": "get_project",
  "taskName": null,
  "projectName": "org chart",
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Show all completed tasks for Brad from last 2 weeks"
→ {
  "clientNames": ["Brad"],
  "intent": "list_tasks",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": "last_2_weeks",
  "searchKeywords": null,
  "taskStatus": "completed",
  "assignee": null,
  "actionData": null
}

Query: "Find any tasks about cashflow for Martin"
→ {
  "clientNames": ["Martin"],
  "intent": "search_tasks",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": ["cashflow"],
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "What's the latest conversation with Rachel?"
→ {
  "clientNames": ["Rachel"],
  "intent": "get_conversation",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Latest conversations with Dale, John and Brad"
→ {
  "clientNames": ["Dale", "John", "Brad"],
  "intent": "get_conversation",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Compare progress for Rachel and Martin"
→ {
  "clientNames": ["Rachel", "Martin"],
  "intent": "compare",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Reply to Brad saying 'Thanks for the update'"
→ {
  "clientNames": ["Brad"],
  "intent": "add_comment",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": { "text": "Thanks for the update" }
}

Query: "List all projects for John Eastwood"
→ {
  "clientNames": ["John Eastwood"],
  "intent": "list_projects",
  "taskName": null,
  "projectName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Show tasks assigned to Jamie in Brad's project"
→ {
  "clientNames": ["Brad"],
  "intent": "list_tasks",
  "taskName": null,
  "projectName": null,
  "sectionName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": "Jamie",
  "actionData": null
}

Query: "What's happening in John's PLAN section?"
→ {
  "clientNames": ["John"],
  "intent": "get_section",
  "taskName": null,
  "projectName": null,
  "sectionName": "PLAN",
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Show me Rachel's board"
→ {
  "clientNames": ["Rachel"],
  "intent": "get_board",
  "taskName": null,
  "projectName": null,
  "sectionName": null,
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "What conversations are in the CONVERT section for Brad?"
→ {
  "clientNames": ["Brad"],
  "intent": "get_section",
  "taskName": null,
  "projectName": null,
  "sectionName": "CONVERT",
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Show me what's in DELIVER for John Eastwood"
→ {
  "clientNames": ["John Eastwood"],
  "intent": "get_section",
  "taskName": null,
  "projectName": null,
  "sectionName": "DELIVER",
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "Check alexandra's right next thing section"
→ {
  "clientNames": ["Alexandra"],
  "intent": "get_section",
  "taskName": null,
  "projectName": null,
  "sectionName": "Right next thing",
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}

Query: "What tasks are in the Right next thing for Brad?"
→ {
  "clientNames": ["Brad"],
  "intent": "get_section",
  "taskName": null,
  "projectName": null,
  "sectionName": "Right next thing",
  "specificDate": null,
  "timeRange": null,
  "searchKeywords": null,
  "taskStatus": null,
  "assignee": null,
  "actionData": null
}`;

      // Add current client context if available
      if (currentClient) {
        systemPrompt += `

**CURRENT CONTEXT:** User was discussing "${currentClient}"

**Context Rules:**
- If user says "he", "his", "him", "she", "her", "them", "their" → use ["${currentClient}"]
- If user says "the client", "the project", "this one" → use ["${currentClient}"]
- If user mentions ANY new name(s) → use those new names as array
- If user says "that task" or "the task" → use previous task context if available

**FOLLOW-UP QUESTION DETECTION:**
When user asks follow-up questions about previous results, interpret them correctly:
- "which task is that from?" → intent: "get_conversation" (re-fetch with context)
- "what other comments are there?" → intent: "get_conversation" (same client, get all)
- "show me more" → intent: "get_conversation" (same client, expand results)
- "what section is it in?" → intent: "get_board" (get board structure)
- "tell me more about that task" → intent: "get_task" with taskName from context
- "what's the full thread?" → intent: "get_conversation" (get all comments)`;
      }

      systemPrompt += `

**OUTPUT FORMAT:** Return ONLY valid JSON with all fields. Use null for fields not mentioned.

{
  "clientNames": ["array of client names"] or ["unknown"],
  "intent": "string",
  "taskName": "string or null",
  "projectName": "string or null",
  "sectionName": "string or null",
  "specificDate": "YYYY-MM-DD or null",
  "timeRange": "string or null",
  "searchKeywords": ["array"] or null,
  "taskStatus": "string or null",
  "assignee": "string or null",
  "actionData": {object} or null
}`;

      // Build messages array with conversation history
      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        }
      ];

      // Add conversation history (last 5 messages for context)
      const recentHistory = conversationHistory.slice(-5);
      messages.push(...recentHistory);

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      console.log('🤖 OpenAI context:', {
        currentClient,
        historyLength: conversationHistory.length,
        recentMessages: recentHistory.length
      });

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const content = response.choices[0].message.content;

      // Parse JSON, handling potential markdown code blocks
      let jsonContent = content;
      if (content.includes('```')) {
        jsonContent = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      const extracted = JSON.parse(jsonContent);

      console.log('📊 Extracted intent:', extracted);

      // Handle both old format (clientName string) and new format (clientNames array)
      let clientNames = extracted.clientNames;
      if (!clientNames && extracted.clientName) {
        // Backwards compatibility: convert single clientName to array
        clientNames = [extracted.clientName];
      }
      if (!clientNames || clientNames.length === 0) {
        clientNames = currentClient ? [currentClient] : ['unknown'];
      }

      return {
        clientNames: clientNames,
        // Keep clientName for backwards compatibility (first client)
        clientName: clientNames[0] || currentClient || 'unknown',
        intent: extracted.intent || 'status',
        taskName: extracted.taskName || null,
        projectName: extracted.projectName || null,
        sectionName: extracted.sectionName || null,
        specificDate: extracted.specificDate || null,
        timeRange: extracted.timeRange || null,
        searchKeywords: extracted.searchKeywords || null,
        taskStatus: extracted.taskStatus || null,
        assignee: extracted.assignee || null,
        actionData: extracted.actionData || null,
        success: true,
      };
    } catch (error) {
      console.error('Error extracting intent from OpenAI:', error);
      return {
        clientNames: currentClient ? [currentClient] : ['unknown'],
        clientName: currentClient || 'unknown',
        intent: 'status',
        taskName: null,
        projectName: null,
        sectionName: null,
        specificDate: null,
        timeRange: null,
        searchKeywords: null,
        taskStatus: null,
        assignee: null,
        actionData: null,
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = OpenAIIntentExtractor;
