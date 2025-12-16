/**
 * Language Pre-Processor
 *
 * Deterministic text normalization BEFORE intent extraction.
 * No AI, no interpretation - just string cleanup.
 *
 * Order of operations:
 * 1. Lowercase
 * 2. Normalize whitespace
 * 3. Fix known typos
 * 4. Expand shorthand
 * 5. Rewrite confusing terminology
 */

class LanguagePreprocessor {
  constructor() {
    // Known typos → corrections (all lowercase)
    this.TYPO_MAP = {
      'priovate': 'private',
      'privat': 'private',
      'pirvatee': 'private',
      'accounr': 'account',
      'acount': 'account',
      'acounts': 'accounts',
      'converstaion': 'conversation',
      'conversaton': 'conversation',
      'convesation': 'conversation',
      'coment': 'comment',
      'coments': 'comments',
      'commnet': 'comment',
      'commnets': 'comments',
      'progres': 'progress',
      'porgress': 'progress',
      'messege': 'message',
      'mesage': 'message',
      'messsage': 'message',
      'recnet': 'recent',
      'recentt': 'recent',
      'latets': 'latest',
      'lastest': 'latest',
      'detials': 'details',
      'deatils': 'details',
      'sectoin': 'section',
      'secton': 'section',
      'taks': 'task',
      'tsak': 'task',
      'tsaks': 'tasks',
      'febuary': 'february',
      'feburary': 'february',
      'janurary': 'january',
      'wendsday': 'wednesday',
      'wensday': 'wednesday',
      'thrusday': 'thursday',
      'thurdsay': 'thursday',
    };

    // Shorthand expansions (all lowercase)
    this.SHORTHAND_MAP = {
      'p an l': 'p&l',
      'p n l': 'p&l',
      'pnl': 'p&l',
      'p and l': 'p&l',
      'pandl': 'p&l',
      'p & l': 'p&l',
      'pl tracker': 'p&l tracker',
      'feb': 'february',
      'jan': 'january',
      'mar': 'march',
      'apr': 'april',
      'jun': 'june',
      'jul': 'july',
      'aug': 'august',
      'sep': 'september',
      'sept': 'september',
      'oct': 'october',
      'nov': 'november',
      'dec': 'december',
      'convo': 'conversation',
      'convos': 'conversations',
      'msg': 'message',
      'msgs': 'messages',
      'info': 'information',
      'asap': 'as soon as possible',
      'rn': 'right now',
      'w/': 'with',
      'w/o': 'without',
      'b/c': 'because',
      'abt': 'about',
    };

    // Terminology rewrites (phrase → normalized phrase)
    this.TERM_MAP = {
      'private user': 'client commenter',
      'private users': 'client commenters',
      'non-coach': 'client commenter',
      'non coach': 'client commenter',
      'their account': 'their tasks',
      'his account': 'his tasks',
      'her account': 'her tasks',
      'on the account': 'on the tasks',
      'last convo': 'last conversation',
      'recent convo': 'recent conversation',
      'whats up with': 'status of',
      "what's up with": 'status of',
      'hows it going with': 'status of',
      "how's it going with": 'status of',
      'catch me up on': 'status of',
      'bring me up to speed on': 'status of',
      'fill me in on': 'status of',
    };

    // Business name noise words to handle (used in client matching, not removed here)
    this.BUSINESS_NOISE = ['construction', 'builders', 'building', 'developments',
                           'ltd', 'llc', 'llp', 'inc', 'co', 'company', 'group'];
  }

  /**
   * Main preprocessing function
   * @param {string} input - Raw user input
   * @returns {string} - Cleaned, normalized text
   */
  process(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let text = input;

    // Step 1: Lowercase
    text = text.toLowerCase();

    // Step 2: Normalize whitespace (multiple spaces → single space, trim)
    text = text.replace(/\s+/g, ' ').trim();

    // Step 3: Fix known typos (word-level replacement)
    text = this.fixTypos(text);

    // Step 4: Expand shorthand (phrase-level replacement)
    text = this.expandShorthand(text);

    // Step 5: Rewrite confusing terminology (phrase-level replacement)
    text = this.rewriteTerminology(text);

    // Step 6: Final whitespace cleanup
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Fix known typos using word-level replacement
   */
  fixTypos(text) {
    const words = text.split(' ');
    const fixed = words.map(word => {
      // Remove punctuation for matching, preserve for output
      const cleanWord = word.replace(/[.,!?;:'"()]/g, '');
      const punctuation = word.replace(cleanWord, '');

      if (this.TYPO_MAP[cleanWord]) {
        return this.TYPO_MAP[cleanWord] + punctuation;
      }
      return word;
    });
    return fixed.join(' ');
  }

  /**
   * Expand shorthand phrases
   */
  expandShorthand(text) {
    let result = text;

    // Sort by length descending to match longer phrases first
    const sortedKeys = Object.keys(this.SHORTHAND_MAP)
      .sort((a, b) => b.length - a.length);

    for (const shorthand of sortedKeys) {
      // Use word boundary matching where appropriate
      const regex = new RegExp(`\\b${this.escapeRegex(shorthand)}\\b`, 'gi');
      result = result.replace(regex, this.SHORTHAND_MAP[shorthand]);
    }

    return result;
  }

  /**
   * Rewrite confusing terminology to normalized forms
   */
  rewriteTerminology(text) {
    let result = text;

    // Sort by length descending to match longer phrases first
    const sortedKeys = Object.keys(this.TERM_MAP)
      .sort((a, b) => b.length - a.length);

    for (const term of sortedKeys) {
      const regex = new RegExp(this.escapeRegex(term), 'gi');
      result = result.replace(regex, this.TERM_MAP[term]);
    }

    return result;
  }

  /**
   * Escape special regex characters in a string
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract potential client name from preprocessed text
   * Returns the text with potential client name hints
   */
  extractClientHints(text) {
    // Patterns that indicate a client name follows
    const patterns = [
      /(?:for|with|about|on|from)\s+([a-z]+(?:\s+[a-z]+)?)/i,
      /([a-z]+(?:\s+[a-z]+)?)'s\s+(?:tasks?|progress|p&l|section|board|conversation)/i,
      /status\s+of\s+([a-z]+(?:\s+[a-z]+)?)/i,
    ];

    const hints = [];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        hints.push(match[1].trim());
      }
    }

    return hints;
  }
}

module.exports = LanguagePreprocessor;
