/**
 * DateNormalizer - Deterministic date parsing
 *
 * Converts natural language date references to ISO date strings or ranges.
 * Runs BEFORE GPT - pure string logic.
 *
 * Rules (locked in):
 * - Month name alone = most recent occurrence of that month
 * - "last week" = previous Monday to Sunday
 * - "yesterday" = previous day
 * - "recent" = last 7 days
 */
class DateNormalizer {
  constructor() {
    this.MONTHS = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };

    // Patterns that indicate date references
    this.DATE_PATTERNS = [
      // "from february", "in february", "during february"
      /(?:from|in|during|for)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi,
      // "february comments", "march conversation"
      /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(?:comments?|conversations?|updates?|messages?|tasks?)/gi,
      // Just month name at word boundary
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    ];
  }

  /**
   * Get the most recent occurrence of a month
   * If the month hasn't occurred yet this year, use last year
   */
  getMostRecentMonth(monthIndex) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let year = currentYear;
    // If the requested month is in the future, use last year
    if (monthIndex > currentMonth) {
      year = currentYear - 1;
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0); // Last day of month

    return {
      start: this.formatDate(startDate),
      end: this.formatDate(endDate),
      month: monthIndex,
      year: year
    };
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse relative date references
   */
  parseRelativeDate(text) {
    const lower = text.toLowerCase();
    const now = new Date();

    // Yesterday
    if (lower.includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        type: 'single',
        date: this.formatDate(yesterday),
        label: 'yesterday'
      };
    }

    // Today
    if (lower.includes('today')) {
      return {
        type: 'single',
        date: this.formatDate(now),
        label: 'today'
      };
    }

    // Last week
    if (lower.includes('last week')) {
      const lastMonday = new Date(now);
      lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return {
        type: 'range',
        start: this.formatDate(lastMonday),
        end: this.formatDate(lastSunday),
        label: 'last_week'
      };
    }

    // This week
    if (lower.includes('this week')) {
      const monday = new Date(now);
      monday.setDate(monday.getDate() - monday.getDay() + 1);
      return {
        type: 'range',
        start: this.formatDate(monday),
        end: this.formatDate(now),
        label: 'this_week'
      };
    }

    // Last month
    if (lower.includes('last month')) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        type: 'range',
        start: this.formatDate(lastMonth),
        end: this.formatDate(lastMonthEnd),
        label: 'last_month'
      };
    }

    // Recent / recently (default to last 7 days)
    if (lower.includes('recent')) {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        type: 'range',
        start: this.formatDate(weekAgo),
        end: this.formatDate(now),
        label: 'last_week'
      };
    }

    // Last N days
    const lastNDaysMatch = lower.match(/last\s+(\d+)\s+days?/);
    if (lastNDaysMatch) {
      const days = parseInt(lastNDaysMatch[1], 10);
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - days);
      return {
        type: 'range',
        start: this.formatDate(pastDate),
        end: this.formatDate(now),
        label: `last_${days}_days`
      };
    }

    return null;
  }

  /**
   * Parse month-only references
   */
  parseMonthReference(text) {
    const lower = text.toLowerCase();

    for (const [monthName, monthIndex] of Object.entries(this.MONTHS)) {
      // Check for month name in text
      const regex = new RegExp(`\\b${monthName}\\b`, 'i');
      if (regex.test(lower)) {
        // Check if there's a year specified
        const yearMatch = lower.match(new RegExp(`${monthName}\\s+(\\d{4})`, 'i'));
        if (yearMatch) {
          const year = parseInt(yearMatch[1], 10);
          const startDate = new Date(year, monthIndex, 1);
          const endDate = new Date(year, monthIndex + 1, 0);
          return {
            type: 'range',
            start: this.formatDate(startDate),
            end: this.formatDate(endDate),
            month: monthIndex,
            year: year,
            label: `${monthName}_${year}`
          };
        }

        // No year - use most recent occurrence
        const range = this.getMostRecentMonth(monthIndex);
        return {
          type: 'range',
          start: range.start,
          end: range.end,
          month: monthIndex,
          year: range.year,
          label: monthName
        };
      }
    }

    return null;
  }

  /**
   * Parse specific date formats
   * Supports: "Oct 13", "October 13", "13 October", "2025-10-13", "10/13/2025"
   */
  parseSpecificDate(text) {
    const lower = text.toLowerCase();

    // ISO format: 2025-10-13
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        type: 'single',
        date: isoMatch[0],
        label: 'specific'
      };
    }

    // US format: 10/13/2025 or 10/13
    const usMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (usMatch) {
      const month = parseInt(usMatch[1], 10) - 1;
      const day = parseInt(usMatch[2], 10);
      const year = usMatch[3] ? parseInt(usMatch[3], 10) : new Date().getFullYear();
      const date = new Date(year, month, day);
      return {
        type: 'single',
        date: this.formatDate(date),
        label: 'specific'
      };
    }

    // Month day format: "October 13", "Oct 13", "13 October"
    for (const [monthName, monthIndex] of Object.entries(this.MONTHS)) {
      // "October 13" or "Oct 13"
      const mdMatch = lower.match(new RegExp(`${monthName}\\s+(\\d{1,2})(?:th|st|nd|rd)?(?:\\s*,?\\s*(\\d{4}))?`, 'i'));
      if (mdMatch) {
        const day = parseInt(mdMatch[1], 10);
        const year = mdMatch[2] ? parseInt(mdMatch[2], 10) : new Date().getFullYear();
        const date = new Date(year, monthIndex, day);
        return {
          type: 'single',
          date: this.formatDate(date),
          label: 'specific'
        };
      }

      // "13 October" or "13th October"
      const dmMatch = lower.match(new RegExp(`(\\d{1,2})(?:th|st|nd|rd)?\\s+(?:of\\s+)?${monthName}(?:\\s*,?\\s*(\\d{4}))?`, 'i'));
      if (dmMatch) {
        const day = parseInt(dmMatch[1], 10);
        const year = dmMatch[2] ? parseInt(dmMatch[2], 10) : new Date().getFullYear();
        const date = new Date(year, monthIndex, day);
        return {
          type: 'single',
          date: this.formatDate(date),
          label: 'specific'
        };
      }
    }

    return null;
  }

  /**
   * Main normalization function
   * Returns parsed date info or null if no date reference found
   */
  normalize(text) {
    if (!text) return null;

    // Try specific date first (most precise)
    const specific = this.parseSpecificDate(text);
    if (specific) return specific;

    // Try relative dates
    const relative = this.parseRelativeDate(text);
    if (relative) return relative;

    // Try month-only references
    const month = this.parseMonthReference(text);
    if (month) return month;

    return null;
  }

  /**
   * Extract and normalize all date references from text
   * Returns the text with dates normalized to ISO format
   */
  normalizeInText(text) {
    const dateInfo = this.normalize(text);

    if (!dateInfo) {
      return { text, dateInfo: null };
    }

    // If we found a date, return the info for the intent extractor to use
    return {
      text,
      dateInfo
    };
  }
}

module.exports = DateNormalizer;
