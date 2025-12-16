/**
 * ClientMatcher - Two-Phase Client Resolution
 *
 * Phase 1: Candidate Generation
 *   - Normalize all team names
 *   - Strip business noise words
 *   - Generate loose candidates
 *
 * Phase 2: Scoring
 *   - Token overlap
 *   - Substring match
 *   - Levenshtein distance
 *   - Combined score
 *
 * Behavior:
 *   - Score >= 0.7 → auto-select
 *   - Score < 0.7 → return top 3 suggestions
 *   - NEVER fail silently
 */
class ClientMatcher {
  constructor() {
    this.projectCache = null;
    this.cacheTime = 0;
    this.cacheTTL = 3600000; // 1 hour

    // Business noise words to strip for matching
    this.NOISE_WORDS = [
      'construction', 'builders', 'building', 'developments',
      'ltd', 'llc', 'llp', 'inc', 'co', 'company', 'group',
      'services', 'solutions', 'enterprises', 'holdings',
      'the', 'and', '&'
    ];

    // Confidence threshold for auto-selection
    this.AUTO_SELECT_THRESHOLD = 0.7;
  }

  /**
   * Normalize a name for matching
   * - Lowercase
   * - Remove noise words
   * - Remove punctuation
   * - Collapse whitespace
   */
  normalizeName(name) {
    if (!name) return '';

    let normalized = name.toLowerCase();

    // Remove punctuation except spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');

    // Remove noise words
    const words = normalized.split(/\s+/).filter(w => {
      return w.length > 0 && !this.NOISE_WORDS.includes(w);
    });

    return words.join(' ').trim();
  }

  /**
   * Extract individual tokens from a name
   */
  tokenize(name) {
    const normalized = this.normalizeName(name);
    return normalized.split(/\s+/).filter(w => w.length > 1);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2[i - 1] === s1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  /**
   * Calculate token overlap score (0-1)
   * How many query tokens appear in the target?
   */
  tokenOverlapScore(queryTokens, targetTokens) {
    if (queryTokens.length === 0) return 0;

    let matches = 0;
    for (const qToken of queryTokens) {
      for (const tToken of targetTokens) {
        // Exact match
        if (qToken === tToken) {
          matches++;
          break;
        }
        // Partial match (one contains the other, min 3 chars)
        if (qToken.length >= 3 && tToken.length >= 3) {
          if (qToken.includes(tToken) || tToken.includes(qToken)) {
            matches += 0.8;
            break;
          }
        }
      }
    }

    return matches / queryTokens.length;
  }

  /**
   * Calculate substring score (0-1)
   * Does the query appear as a substring in target or vice versa?
   */
  substringScore(query, target) {
    const q = this.normalizeName(query);
    const t = this.normalizeName(target);

    if (q === t) return 1;
    if (t.includes(q)) return 0.9;
    if (q.includes(t)) return 0.85;

    // Check if query words appear in order in target
    const qWords = q.split(/\s+/);
    const tWords = t.split(/\s+/);

    let lastIndex = -1;
    let inOrderMatches = 0;

    for (const qWord of qWords) {
      for (let i = lastIndex + 1; i < tWords.length; i++) {
        if (tWords[i].includes(qWord) || qWord.includes(tWords[i])) {
          inOrderMatches++;
          lastIndex = i;
          break;
        }
      }
    }

    if (inOrderMatches === qWords.length) {
      return 0.8;
    }

    return 0;
  }

  /**
   * Calculate Levenshtein-based similarity score (0-1)
   */
  levenshteinScore(query, target) {
    const q = this.normalizeName(query);
    const t = this.normalizeName(target);

    const maxLen = Math.max(q.length, t.length);
    if (maxLen === 0) return 0;

    const distance = this.levenshteinDistance(q, t);
    return 1 - (distance / maxLen);
  }

  /**
   * Calculate combined score for a candidate
   * Weights: token overlap (40%), substring (35%), levenshtein (25%)
   */
  calculateScore(query, target) {
    const queryTokens = this.tokenize(query);
    const targetTokens = this.tokenize(target);

    const tokenScore = this.tokenOverlapScore(queryTokens, targetTokens);
    const substrScore = this.substringScore(query, target);
    const levScore = this.levenshteinScore(query, target);

    // Weighted combination
    const combined = (tokenScore * 0.4) + (substrScore * 0.35) + (levScore * 0.25);

    // Bonus for exact normalized match
    if (this.normalizeName(query) === this.normalizeName(target)) {
      return 1.0;
    }

    return Math.min(combined, 1.0);
  }

  /**
   * Find best matching project(s) for a client name
   *
   * Returns one of:
   * - { match: project } - Single confident match (score >= 0.7)
   * - { suggestions: [...] } - Multiple suggestions (score < 0.7)
   * - { notFound: true, suggestions: [...] } - No good matches
   */
  async findProject(clientName, projects) {
    if (!clientName) {
      return { notFound: true, reason: 'No client name provided', suggestions: [] };
    }

    console.log(`🔍 Resolving client: "${clientName}"`);

    // Filter out templates and utility projects
    const clientProjects = projects.filter(p => {
      const name = p.name.toLowerCase();
      return !name.includes('template') &&
        !name.includes('project template') &&
        !name.includes('completed assigned') &&
        !name.includes('visual branding') &&
        !name.includes('progress') &&
        !name.includes('email campaigns') &&
        !name.includes('on site') &&
        !name.includes('business development') &&
        !name.includes('roadmap');
    });

    // Phase 1: Generate candidates with scores
    const candidates = clientProjects.map(p => ({
      project: p,
      score: this.calculateScore(clientName, p.name),
      normalizedName: this.normalizeName(p.name)
    }));

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Log top candidates for debugging
    console.log(`📊 Top candidates for "${clientName}":`);
    candidates.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. "${c.project.name}" (score: ${c.score.toFixed(3)})`);
    });

    if (candidates.length === 0) {
      return {
        notFound: true,
        reason: 'No clients found in system',
        suggestions: []
      };
    }

    const topCandidate = candidates[0];

    // Phase 2: Decision based on confidence
    if (topCandidate.score >= this.AUTO_SELECT_THRESHOLD) {
      // High confidence - auto-select
      console.log(`✅ Auto-selected: "${topCandidate.project.name}" (score: ${topCandidate.score.toFixed(3)})`);
      return topCandidate.project;
    }

    // Check for ambiguous case (two very close scores)
    if (candidates.length > 1) {
      const secondCandidate = candidates[1];
      const scoreDiff = topCandidate.score - secondCandidate.score;

      if (scoreDiff < 0.1 && topCandidate.score >= 0.5) {
        // Ambiguous - scores too close
        console.log(`⚠️ Ambiguous match between "${topCandidate.project.name}" and "${secondCandidate.project.name}"`);
        return {
          ambiguous: true,
          suggestions: candidates.slice(0, 3).map(c => ({
            name: c.project.name,
            score: c.score,
            project: c.project
          }))
        };
      }
    }

    // Low confidence - return suggestions
    if (topCandidate.score >= 0.3) {
      console.log(`❓ Low confidence match. Suggesting alternatives.`);
      return {
        lowConfidence: true,
        bestGuess: topCandidate.project,
        bestGuessScore: topCandidate.score,
        suggestions: candidates.slice(0, 3).map(c => ({
          name: c.project.name,
          score: c.score,
          project: c.project
        }))
      };
    }

    // No good matches
    console.log(`❌ No confident match found for "${clientName}"`);
    return {
      notFound: true,
      reason: `No client matching "${clientName}" found`,
      suggestions: candidates.slice(0, 3).map(c => ({
        name: c.project.name,
        score: c.score,
        project: c.project
      }))
    };
  }

  /**
   * Legacy method for backwards compatibility
   * Returns project or null (old behavior)
   */
  async findProjectLegacy(clientName, projects) {
    const result = await this.findProject(clientName, projects);

    // If it's a direct project match (old behavior)
    if (result && result.gid) {
      return result;
    }

    // If it has suggestions, return the best one if score > 0.5
    if (result && result.suggestions && result.suggestions.length > 0) {
      if (result.suggestions[0].score >= 0.5) {
        return result.suggestions[0].project;
      }
    }

    // If it's ambiguous, return that
    if (result && result.ambiguous) {
      return { ambiguous: true, matches: result.suggestions.map(s => s.project) };
    }

    return null;
  }
}

module.exports = ClientMatcher;
