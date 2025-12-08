/**
 * QueryRouter - Parse user queries and extract intent + parameters
 * Handles questions like:
 * - "What's the status on Brad?"
 * - "Status for Brad Goodridge?"
 * - "Tell me about Brad"
 */
class QueryRouter {
  constructor() {
    this.intents = {
      CLIENT_STATUS: /^.*status.*on\s+(.+)\?*$/i,
      CLIENT_QUERY: /^.*(?:what|tell|how|about|info|details?)\s+(?:.*\s+)?(.+?)\?*$/i,
      HELP: /^(?:help|\?|hi|hello)$/i,
    };
  }

  /**
   * Parse a user query and return intent + parameters
   */
  parseQuery(message) {
    if (!message) {
      return { intent: 'ERROR', error: 'Empty message' };
    }

    // Remove bot mention if present
    const cleanMessage = message.replace(/<@.*?>/g, '').trim();

    // Try to match each intent pattern
    for (const [intent, pattern] of Object.entries(this.intents)) {
      const match = cleanMessage.match(pattern);
      if (match) {
        if (intent === 'HELP') {
          return { intent: 'HELP' };
        }

        // Extract client name (could be at end of message)
        let clientName = match[1] ? match[1].trim() : null;

        // If no match from regex, try to extract last capitalized words
        if (!clientName) {
          const words = cleanMessage.split(/\s+/);
          // Look for capitalized words (likely names)
          const nameWords = words
            .filter(w => /^[A-Z]/.test(w))
            .slice(-2); // Take last 2 capitalized words

          if (nameWords.length > 0) {
            clientName = nameWords.join(' ');
          }
        }

        return {
          intent: 'CLIENT_STATUS',
          clientName: clientName || null,
          originalMessage: cleanMessage,
        };
      }
    }

    // Default: treat entire message as client name query
    return {
      intent: 'CLIENT_STATUS',
      clientName: cleanMessage,
      originalMessage: cleanMessage,
    };
  }

  /**
   * Get help message
   */
  getHelpMessage() {
    return `
📖 **Coaching Bot Help**

I can help you get status on your clients!

**Try asking:**
• "What's the status on Brad?"
• "Status for Brad Goodridge?"
• "Tell me about Brad's project"
• "How is John Smith doing?"

I'll fetch the latest project info from Asana and show you:
✅ Project completion %
✅ Total tasks & progress
✅ Open items
✅ Any overdue tasks

Just mention me and ask!
    `.trim();
  }
}

module.exports = QueryRouter;
