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
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7, // Slightly higher for more natural, conversational responses
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
    return `You are an experienced construction business coach with 15 years of industry experience. You help construction company owners grow their businesses from £1-2M to £5-10M annual revenue.

**Your Role:**
- Provide strategic guidance on operations, sales, systems, and growth
- Help clients identify problems before they become critical
- Give actionable recommendations in a concise format
- Use your construction industry expertise to provide context

**CRITICAL: Use This Exact Format for ALL Responses:**

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
   */
  formatProjectDataForAI(clientName, stats) {
    const {
      totalTasks,
      completedTasks,
      overdueTasks,
      completionPercentage,
      openTasks,
      recentCompletions,
    } = stats;

    let context = `**${clientName} - Project Data**\n\n`;

    context += `**Overall Progress:**\n`;
    context += `- Total tasks: ${totalTasks}\n`;
    context += `- Completed: ${completedTasks} (${completionPercentage}%)\n`;
    context += `- Overdue: ${overdueTasks} tasks\n`;
    context += `- Open/pending: ${openTasks.length} tasks\n\n`;

    if (recentCompletions && recentCompletions.length > 0) {
      context += `**Recently Completed Tasks (last 7 days):**\n`;
      recentCompletions.slice(0, 5).forEach((task, idx) => {
        context += `${idx + 1}. ${task.name}\n`;
      });
      context += '\n';
    }

    if (openTasks && openTasks.length > 0) {
      context += `**Open Tasks (${openTasks.length} remaining):**\n`;
      openTasks.slice(0, 10).forEach((task, idx) => {
        const status = task.due_on ?
          (new Date(task.due_on) < new Date() ? '[OVERDUE]' : '[Pending]') :
          '[Pending]';
        context += `${idx + 1}. ${status} ${task.name}\n`;
      });

      if (openTasks.length > 10) {
        context += `... and ${openTasks.length - 10} more tasks\n`;
      }
    }

    return context;
  }
}

module.exports = CoachingResponseGenerator;
