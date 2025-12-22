/**
 * Query SOP Handler
 *
 * Standard Operating Procedure for handling customer queries.
 * Instead of immediately searching, asks clarifying questions ONE AT A TIME
 * to ensure accurate results.
 *
 * SOP CHECKLIST:
 * 1. Client name (required)
 * 2. Section OR Task (helpful - ask if broad query)
 * 3. Time frame (helpful - ask if searching conversations)
 * 4. Person filter (helpful - for coach-specific comments)
 */

class QuerySOPHandler {
  constructor() {
    // Define what makes a query "complete" vs "needs clarification"
    this.COACHES = ['jamie mills', 'nick tobing', 'harmeet johal', 'greg wilkes', 'greg', 'jamie', 'nick', 'harmeet'];

    this.SECTIONS = [
      'PLAN', 'ATTRACT', 'CONVERT', 'DELIVER', 'SCALE',
      'Right next thing', 'Meetings', '1-1 Meetings',
      'Build & Scale Summit 2025', 'Boardroom'
    ];
  }

  /**
   * Analyze query and determine if clarification is needed
   * Returns either a clarification question OR null (proceed with search)
   */
  analyzeQuery(intentResult, sessionContext = {}) {
    const {
      clientNames,
      intent,
      taskName,
      projectName,
      sectionName,
      specificDate,
      timeRange,
      commentAuthor
    } = intentResult;

    // Track what we have vs what we need
    const hasClient = clientNames && clientNames.length > 0 && clientNames[0] !== 'unknown';
    const hasSection = !!sectionName;
    const hasTask = !!taskName;
    const hasTimeFrame = !!specificDate || !!timeRange;
    const hasCommentAuthor = !!commentAuthor;

    // Check if this is a follow-up (user already answered a clarification)
    const isFollowUp = sessionContext.awaitingClarification;
    if (isFollowUp) {
      // User is responding to our question - don't ask again, try to process
      return null;
    }

    // RULE 1: Must have a client
    if (!hasClient) {
      return {
        needsClarification: true,
        question: "Which client would you like me to look up?",
        missingField: 'client'
      };
    }

    // RULE 2: For conversation/comment queries - JUST DO IT
    // Don't ask for clarification. If they have a client name, search and return results.
    // The LLM will provide context and the user can ask follow-ups if needed.
    if (intent === 'get_conversation' || intent === 'get_comment') {
      // Client name is enough - proceed with search
      // Returns most recent conversations, LLM provides context
      return null;
    }

    // RULE 3: For status queries that are too broad
    if (intent === 'status' && !hasSection && !hasTask) {
      // This is okay - we can show general status
      return null;
    }

    // RULE 4: For section queries, we have enough info
    if (intent === 'get_section' && hasSection) {
      return null;
    }

    // RULE 5: For task queries, we have enough info
    if (intent === 'get_task' && hasTask) {
      return null;
    }

    // Query has enough specificity - proceed
    return null;
  }

  /**
   * Generate a friendly clarification message
   */
  formatClarificationResponse(clarification, clientName) {
    if (!clarification || !clarification.needsClarification) {
      return null;
    }

    let response = clarification.question;

    // Add suggestions if available
    if (clarification.suggestions && clarification.suggestions.length > 0) {
      response += '\n\nQuick options:';
      clarification.suggestions.forEach(s => {
        response += `\n• ${s}`;
      });
    }

    return response;
  }

  /**
   * Check if user's response answers our clarification question
   */
  parseFollowUpResponse(userMessage, previousQuestion) {
    const msgLower = userMessage.toLowerCase();

    // Check if they mentioned a section
    for (const section of this.SECTIONS) {
      if (msgLower.includes(section.toLowerCase())) {
        return { type: 'section', value: section };
      }
    }

    // Check for time references
    if (msgLower.includes('last week') || msgLower.includes('past week')) {
      return { type: 'timeRange', value: 'last_week' };
    }
    if (msgLower.includes('last month') || msgLower.includes('past month')) {
      return { type: 'timeRange', value: 'last_month' };
    }
    if (msgLower.includes('last 2 weeks') || msgLower.includes('last two weeks')) {
      return { type: 'timeRange', value: 'last_2_weeks' };
    }
    if (msgLower.includes('recent')) {
      return { type: 'timeRange', value: 'last_2_weeks' };
    }

    // Check if they mentioned a task-like name (contains specific keywords)
    const taskKeywords = ['tracker', 'p&l', 'map', 'website', 'va', 'hire', 'budget', 'meeting'];
    for (const keyword of taskKeywords) {
      if (msgLower.includes(keyword)) {
        // Extract the likely task name
        return { type: 'taskHint', value: userMessage };
      }
    }

    // Couldn't parse - return the raw message as a search hint
    return { type: 'searchHint', value: userMessage };
  }

  /**
   * Determine if we should ask another question or proceed
   * Call this after getting no results from a search
   */
  suggestNextStep(clientName, searchAttempt) {
    const { sectionSearched, taskSearched, timeRangeUsed, commentAuthorFiltered } = searchAttempt;

    if (commentAuthorFiltered && !sectionSearched && !taskSearched) {
      return {
        message: `I searched the recent tasks but couldn't find comments from ${commentAuthorFiltered} on ${clientName}'s tasks. Could you help me narrow it down?\n\n• Do you remember which task or section the comment was on?\n• Or approximately when it was made?`,
        canRetry: true
      };
    }

    if (sectionSearched) {
      return {
        message: `I didn't find what you're looking for in the ${sectionSearched} section. Would you like me to:\n• Check a different section?\n• Search across all tasks?\n• Look at a different time period?`,
        canRetry: true
      };
    }

    return {
      message: `I couldn't find that specific information. Could you give me more details about what you're looking for?`,
      canRetry: true
    };
  }
}

module.exports = QuerySOPHandler;
