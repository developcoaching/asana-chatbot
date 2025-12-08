/**
 * ClientMatcher - Match user input (e.g., "Brad") to Asana projects
 * Uses fuzzy matching to handle typos and partial names
 */
class ClientMatcher {
  constructor() {
    this.projectCache = null;
    this.cacheTime = 0;
    this.cacheTTL = 3600000; // 1 hour
  }

  /**
   * Simple similarity score between two strings (0-1)
   * Enhanced to handle first names and word-level matching
   */
  similarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1;

    // Split into words for better name matching
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    // Check if query matches any word in the project name (first name matching)
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2) return 0.95; // High score for exact word match
        if (word2.startsWith(word1) && word1.length >= 3) return 0.9; // "jam" matches "jamie"
        if (word1.startsWith(word2) && word2.length >= 3) return 0.9;
      }
    }

    // Starts with (full string)
    if (s2.startsWith(s1) || s1.startsWith(s2)) return 0.85;

    // Contains (full string)
    if (s1.includes(s2) || s2.includes(s1)) return 0.7;

    // Levenshtein-like simple check (good enough for names)
    const len = Math.max(s1.length, s2.length);
    let matches = 0;

    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) matches++;
    }

    return matches / len;
  }

  /**
   * Find best matching project for a client name
   */
  async findProject(clientName, projects) {
    if (!clientName) {
      return null;
    }

    console.log(`🔍 Matching "${clientName}" to projects...`);

    // Filter out templates and utility projects
    const clientProjects = projects.filter(p => {
      const name = p.name.toLowerCase();
      // Skip templates and utility projects
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

    // Score each project
    const scored = clientProjects.map(p => ({
      project: p,
      score: this.similarity(clientName, p.name),
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return null;
    }

    const topMatch = scored[0];

    // If score is too low, it's probably not a match
    if (topMatch.score < 0.3) {
      return null;
    }

    console.log(`✅ Best match: "${topMatch.project.name}" (score: ${topMatch.score.toFixed(2)})`);

    // Check if there's a very close second match (ambiguous)
    if (scored.length > 1 && scored[1].score > 0.7 && topMatch.score < 0.95) {
      console.log(`⚠️  Ambiguous: also matched "${scored[1].project.name}"`);
      return {
        ambiguous: true,
        matches: scored.slice(0, 3).map(s => s.project),
      };
    }

    return topMatch.project;
  }
}

module.exports = ClientMatcher;
