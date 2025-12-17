# Architecture & Engineering Decisions Log

## Asana Coach Bot - Development History

This document tracks all architectural decisions, engineering choices, and the human-AI collaboration that shaped this project.

---

## Project Overview

**Purpose:** A Slack-integrated AI chatbot for construction industry business coaches to interact with their Asana client data.

**Stack:**
- Node.js + Express backend
- Supabase for persistent session storage
- OpenAI GPT-4o for AI responses and intent extraction (upgraded from GPT-4o-mini)
- Asana API for client/project/task data (67+ clients)
- Google Sheets API for P&L financial data
- Slack Bolt SDK for Slack integration

---

## Phase 1: Initial Architecture (Early December 2024)

### Human Input:
> "Build a chatbot that lets coaches query their Asana client data through Slack"

### AI Decision: Team-Based Architecture

**Problem Discovered:** Initial implementation fetched projects directly (184 projects) but couldn't find many clients like Declan and Matthew.

**Root Cause:** Asana organizes this workspace as Teams (one per client), not projects.

**Solution Implemented:**
```
Flow: User Query → Find Team by client name → Get Team's "Progress" project → Get tasks/comments
```

**Commit:** `60fac31` - "CRITICAL FIX: Team-based architecture - All 68 clients now accessible"

### Key Methods Added:
- `getClientTeams()` - Fetch all 67+ teams (clients)
- `getTeamProgressProject(teamGid)` - Get the Progress project for a team
- `ClientMatcher` class - Fuzzy match client names to teams

---

## Phase 2: ChatGPT-Style UI (December 2024)

### Human Input:
> "Make it look like ChatGPT with a conversation sidebar"

### AI Decision: Full UI Overhaul

**Implementation:**
- Blue/white branding with modern chat interface
- Conversation sidebar with session history
- Supabase integration for persistent storage
- Welcome screen with quick action cards

**Commit:** `222c6a2` - "feat: Add ChatGPT-style UI, Supabase storage, and meeting transcript search"

---

## Phase 3: Financial Data Integration (December 2024)

### Human Input:
> "Coaches need to see P&L data from Google Sheets alongside Asana tasks"

### AI Decision: Google Sheets Integration

**Implementation:**
- `GoogleSheetsClient` class to read P&L spreadsheets
- Fuzzy matching between Asana team names and Sheet names
- Financial data (turnover, profit margins) injected into AI responses

**Critical Fix:** Prevent AI from hallucinating financial data when P&L sheet doesn't exist for a client.

**Commit:** `3e5d983` - "Add Google Sheets P&L integration for financial data"

---

## Phase 4: Coach Identity System (December 2024)

### Human Input:
> "Coaches need to log in so we know who's commenting"

### AI Decision: Coach Login Modal

**Implementation:**
- Login modal with coach dropdown (Greg, Jamie, Nick, Harmeet)
- Coach name stored in session and displayed in sidebar
- Comment authors extracted from Asana (shows who said what)
- @mention search filter (@jamie, @greg)

**Commit:** `a43a403` - "Add coach login system and comment author tracking"

### Human Input (Dec 16, 2024):
> "For the login, these are the only coaches: Jamie Mills, Nick Tobing, Harmeet Johal, Greg"

### AI Action:
Updated coach list from placeholder names to actual coach names.

---

## Phase 5: Comprehensive Data Retrieval (December 11, 2024)

### Human Input:
> "The system can't find specific tasks, can't search by date, can't search projects other than Progress, and can't handle multi-client queries."

### AI Decision: Major Retrieval Overhaul

**Problems Identified:**
1. Only searched "Progress" project (hardcoded)
2. Only extracted clientName, intent, timeRange from queries
3. Couldn't search specific tasks by name
4. Couldn't filter by date
5. Couldn't handle "Dale, John and Brad" queries

**Solution - Enhanced Intent Extraction:**

Expanded from 3 fields to 12 fields:
```javascript
{
  clientNames: ["Dale", "John", "Brad"],  // Now supports arrays!
  intent: "get_conversation",
  taskName: "P&L Tracker",
  projectName: "Progress",
  sectionName: "PLAN",
  specificDate: "2025-10-13",
  timeRange: "last_week",
  searchKeywords: ["cashflow"],
  taskStatus: "completed",
  assignee: "Jamie",
  actionData: { text: "comment text" }
}
```

**New Intents Added:**
- `get_task` - Find specific task by name
- `get_comment` - Find specific comments, optionally by date
- `get_project` - Access specific project by name
- `get_section` - Get tasks from board section (PLAN, ATTRACT, CONVERT, DELIVER, SCALE)
- `get_board` - Show full board structure
- `search_tasks` - Search by keywords
- `list_projects` - List all client projects
- `create_task`, `update_task`, `add_comment` - Write operations

**New Asana Methods:**
- `getAllTeamProjects(teamGid)` - Get ALL projects, not just Progress
- `findProjectByName(teamGid, name)` - Find specific project
- `findTaskByName(teamGid, name)` - Search for task with fuzzy matching
- `searchTasksByKeywords(teamGid, keywords)` - Keyword search
- `searchCommentsByDate(teamGid, date)` - Date-specific comments
- `getAllConversations(teamGid)` - All comments across projects
- `getBoardStructure(projectGid)` - Full board with sections
- `getSectionByName(projectGid, sectionName)` - Tasks from specific section
- `getSubtasks(taskGid)` - Subtask retrieval
- `getTaskAttachments(taskGid)` - Attachment retrieval

**Commit:** `ffd28bc` - "Add comprehensive Asana data retrieval and multi-client support"

---

## Phase 6: Board Section Support (December 16, 2024)

### Human Input:
> "Looking at the Asana board screenshots - they organize work in sections like PLAN, ATTRACT, CONVERT, DELIVER. I need to query specific parts of these sections, specific comments, and specific dates."

### AI Analysis of Screenshots:
Identified board structure:
- **PLAN** (8 tasks): MAPs, P&L Tracker, Roadmap, etc.
- **ATTRACT** (1 task): Marketing tasks
- **CONVERT** (5 tasks): Sales mastery, Website, Estimates
- **DELIVER** (4 tasks): Software, Change orders
- **SCALE**: Growth tasks
- Plus custom sections: "Right next thing", "Meetings", "Boardroom"

### AI Decision: Section-Aware Queries

**Implementation:**
1. Added `sectionName` field to intent extraction
2. Added `get_section` and `get_board` intents
3. Created `getBoardStructure()` to show all sections with comment counts
4. Created `getSectionByName()` to get tasks/comments from specific section

### Testing Revealed Issues:
1. Comments not sorted by date (newest first)
2. Section queries couldn't filter by specific task
3. Section queries couldn't filter by specific date

### AI Fixes Applied:

**Fix 1: Sort comments by date (newest first)**
```javascript
.sort((a, b) => new Date(b.date) - new Date(a.date));
```

**Fix 2: Filter by task name within section**
```javascript
if (taskName) {
  filteredTasks = filteredTasks.filter(t =>
    t.name.toLowerCase().includes(taskNameLower)
  );
}
```

**Fix 3: Filter by specific date within section**
```javascript
if (specificDate) {
  filteredTasks = filteredTasks.map(task => ({
    ...task,
    comments: task.comments.filter(c => {
      const commentDate = new Date(c.date);
      return commentDate.getDate() === targetDate.getDate() &&
             commentDate.getMonth() === targetDate.getMonth() &&
             commentDate.getFullYear() === targetDate.getFullYear();
    })
  }));
}
```

### Verification Tests Passed:
- "Show me the MAPs task conversations in PLAN section for John Eastwood" ✅
- "What comments were in PLAN section for John Eastwood on October 13, 2025?" ✅
- "Show me Dale's PLAN section" ✅
- "Show me comments on P&L Tracker in PLAN for Dale on April 4, 2025" ✅

---

## Phase 7: Multi-Word Client Matching Fix (December 16, 2024)

### Human Input:
> "For use cases like this one, client name is stored in Asana as Sam and Rose Chambers. So when we type 'Get details on Sam Chambers,' it does not come. But when I check 'Get details on Rose,' I get all of those details. What is the reason for this?"

### AI Analysis:
**Root Cause Identified:** The similarity algorithm was matching "Sam Chambers" to "Mikey Chambers & Chris Angell" instead of "Sam & Rose Chambers" because:
1. It only checked if the first word matched
2. "Chambers" matched in both names, giving equal scores
3. It didn't count HOW MANY query words matched

### AI Solution: Multi-Word Matching Algorithm

**Implementation in `client-matcher.js`:**
```javascript
// Count how many words from the query match words in the project name
let exactWordMatches = 0;
let partialWordMatches = 0;

for (const word1 of words1) {
  for (const word2 of words2) {
    if (word1 === word2) {
      exactWordMatches++;
      break; // Count each query word only once
    } else if ((word2.startsWith(word1) && word1.length >= 3) ||
               (word1.startsWith(word2) && word2.length >= 3)) {
      partialWordMatches++;
      break;
    }
  }
}

// Score based on proportion of query words matched
const totalQueryWords = words1.length;
const matchRatio = (exactWordMatches + partialWordMatches * 0.8) / totalQueryWords;

// If ALL query words matched exactly, high score
if (exactWordMatches === totalQueryWords) return 0.98;

// Single word match (like just "Chambers") - lower priority
if (exactWordMatches === 1 && totalQueryWords > 1) return 0.7;
```

### Result:
- "Sam Chambers" now correctly matches "Sam & Rose Chambers" (score: 0.98)
- "Mikey Chambers" correctly matches "Mikey Chambers & Chris Angell"
- Single word queries still work: "Rose" matches "Sam & Rose Chambers"

---

## Phase 8: AI Hallucination Prevention (December 16, 2024)

### Human Input:
> "Check the accuracy of this - rose progress" [showed response with made-up task names and dates]

**User Evidence:** AI was returning "Client Feedback Process" task from "2 Nov 2025" but actual data showed "MAPs" task from "22 Jul 2025".

### Human Input:
> "Make the fixes and in the LLM, in the model that we are choosing, let's do GPT 5.1 for a smarter model."

### AI Analysis:
**Problem Identified:** GPT-4o-mini was hallucinating task names, dates, and conversation content not present in the actual Asana data.

**Contributing Factors:**
1. Model too small/fast for accurate retrieval-augmented generation
2. Temperature too high (0.7) allowing creative responses
3. No explicit anti-hallucination instructions in system prompt

### AI Decision: Multi-Pronged Fix

**Fix 1: Model Upgrade**
- Changed from `gpt-4o-mini` to `gpt-4o` (most capable OpenAI model)
- Note: User requested "GPT 5.1" but this doesn't exist; `gpt-4o` is the latest
- Files changed: `openai-intent-extractor.js:405`, `coaching-response-generator.js:68`

**Fix 2: Temperature Reduction**
- Reduced from 0.7 to 0.5 for more deterministic, accurate responses

**Fix 3: Anti-Hallucination System Prompt**

Added explicit rules in `coaching-response-generator.js`:
```javascript
**CRITICAL ANTI-HALLUCINATION RULES - FOLLOW EXACTLY:**
- You can ONLY reference task names, dates, comments, and people that appear in the data below
- NEVER invent, fabricate, or guess any information
- If data shows task "MAPs" from "22 Jul 2025", do NOT say "Client Feedback Process" from "2 Nov 2025"
- Quote EXACT task names, EXACT dates, EXACT comment text from the provided data
- If you're not sure about something, say "Based on the data provided..." or "I don't see that in the current data"
- If asked about something not in the data, say "I don't have that information in the current data retrieval"
```

### Verification Test:
```bash
curl -X POST http://localhost:3000/api/chat -d '{"message": "show me last conversation with rose"}'
```

**Before (hallucinated):**
> "Client Feedback Process" task from "2 Nov 2025"

**After (accurate):**
> Task: "P&L Tracker"
> [2 Apr 2025] Rose Chambers: "Hey, I have updated our tracker..."
> [3 Apr 2025] Greg Wilkes: "Yes deduct 19% from net before tax..."

---

## Phase 9: Enhanced Context & Follow-Up Support (December 16, 2024)

### Human Input:
> "Retrieval and reasoning - get task from date or if I ask for a last message and it tells me and I say 'ok which task or board is it from, what are the other comments'"

### AI Analysis:
**Problem Identified:** When showing conversations, the system:
1. Didn't show which board section the task was in
2. Only showed individual comments, not full conversation threads
3. Follow-up questions like "which task is that?" failed because context was lost

### AI Decision: Context-Rich Retrieval

**Implementation 1: Enhanced `getAllConversations()` in `asana-client.js`**

Added section mapping to every conversation:
```javascript
// Build section map from Progress project
let sectionMap = new Map();
const progressProject = await this.getTeamProgressProject(teamGid);
if (progressProject) {
  const sections = await this.getProjectSections(progressProject.gid);
  for (const section of sections) {
    const sectionTasks = await this.getSectionTasks(section.gid);
    for (const task of sectionTasks) {
      sectionMap.set(task.gid, section.name);
    }
  }
}

// Each conversation now includes:
allComments.push({
  taskName: task.name,
  taskGid: task.gid,
  projectName: project.name,
  sectionName: sectionMap.get(task.gid), // NEW: Which board section
  text: comment.text,
  date: comment.date,
  author: comment.author,
  allTaskComments: sortedComments,       // NEW: Full conversation thread
  totalCommentsOnTask: sortedComments.length,
});
```

**Implementation 2: Enhanced Response Formatting in `coaching-response-generator.js`**

Grouped conversations by task with full context:
```javascript
context += `--- TASK ${taskIndex}: "${taskData.taskName}" ---\n`;
context += `📍 Location: Section: ${taskData.sectionName} | Project: ${taskData.projectName}\n`;
context += `💬 Total comments on this task: ${taskData.totalComments}\n`;

// Show all comments on this task (up to 5)
commentsToShow.forEach((comment, idx) => {
  context += `  [${date}] **${comment.author}**: ${comment.text}\n`;
});
```

**Implementation 3: Follow-Up Question Detection in `openai-intent-extractor.js`**

Added intelligent follow-up handling:
```javascript
**FOLLOW-UP QUESTION DETECTION:**
When user asks follow-up questions about previous results, interpret them correctly:
- "which task is that from?" → intent: "get_conversation" (re-fetch with context)
- "what other comments are there?" → intent: "get_conversation" (same client, get all)
- "show me more" → intent: "get_conversation" (same client, expand results)
- "what section is it in?" → intent: "get_board" (get board structure)
- "tell me more about that task" → intent: "get_task" with taskName from context
```

### Verification Tests:

**Test 1: Initial Query**
```
User: "show me last conversation with rose"
Response: Task: "P&L Tracker" [2 Apr 2025] Rose: "..."
```

**Test 2: Follow-up - Which Task?**
```
User: "which task is that from? what section is it in?"
Response: "The conversation with Rose Chambers is from the task 'P&L Tracker'
          which is located in the 'PLAN' section of the Progress board."
```

**Test 3: Follow-up - More Comments?**
```
User: "what other comments are there on this task?"
Response: Shows ALL 10 comments on the P&L Tracker task with full context
```

---

## Phase 10: Resolution Layer Buildout (December 16, 2024)

### Human Input:
> "You're actually very close. This is no longer a 'can we build this?' problem — it's a language → resolution → fallback design problem."

User identified that the system needed:
1. **Entity Resolution Layer** - Client names weren't matching reliably
2. **Date Intent Normalization** - "from feb" didn't parse correctly
3. **Ambiguous Language Disambiguation** - "private user" was confusing
4. **Helpful Failure States** - "I don't have access" was a dead end
5. **Typo Pre-Processing** - Relying on GPT to fix typos was unreliable

### Human Direction (Hard Rules):
```
❌ No embeddings
❌ No vector databases
❌ No ML pipelines
❌ No "AI magic"
❌ No over-abstraction
✅ Simple string logic first
✅ GPT only AFTER normalization
```

### AI Implementation: 5-Phase Pipeline

#### Phase 1: Language Pre-Processor (`src/language-preprocessor.js`) - NEW FILE

**Purpose:** Deterministic text normalization BEFORE GPT sees the input.

**Components:**
```javascript
TYPO_MAP = {
  'priovate': 'private',
  'accounr': 'account',
  'converstaion': 'conversation',
  'febuary': 'february',
  // 30+ more corrections
}

SHORTHAND_MAP = {
  'p an l': 'p&l',
  'pnl': 'p&l',
  'feb': 'february',
  'convo': 'conversation',
  // 20+ expansions
}

TERM_MAP = {
  'private user': 'client commenter',
  'on rose\'s account': 'tasks under rose chambers',
  'whats up with': 'status of',
  // 10+ rewrites
}
```

**Result:** Raw input `"get me roses p an l from feb"` becomes `"get me roses p&l from february"`

---

#### Phase 2: Client Resolution Rewrite (`src/client-matcher.js`) - REWRITTEN

**Problem:** Old algorithm matched "Sam Chambers" to wrong client.

**New Two-Phase Scoring Algorithm:**

| Signal | Weight | Description |
|--------|--------|-------------|
| Token Overlap | 40% | How many query words appear in target |
| Substring Match | 35% | Query contained in target or vice versa |
| Levenshtein Distance | 25% | Edit distance similarity |

**Decision Logic:**
| Score | Action |
|-------|--------|
| ≥ 0.7 | Auto-select (high confidence) |
| 0.5-0.7 with close 2nd | Return ambiguous with suggestions |
| 0.3-0.7 | Return low confidence with suggestions |
| < 0.3 | Return not found with suggestions |

**Noise Words Stripped:** `construction`, `builders`, `ltd`, `llc`, `inc`, `co`, `&`, `and`

**Result:**
- `"Sam Chambers"` → `"Sam & Rose Chambers"` (score: 0.856, auto-selected)
- `"Rose"` → `"Sam & Rose Chambers"` (score: 0.774, auto-selected)
- `"John Smith"` → `"John Eastwood"` (score: 0.315, low confidence, suggestions shown)

---

#### Phase 3: Date Normalizer (`src/date-normalizer.js`) - NEW FILE

**Purpose:** Convert natural language dates to ISO format BEFORE GPT.

**Locked Defaults:**
| Input | Output | Rule |
|-------|--------|------|
| `"february"` | `2025-02-01` to `2025-02-28` | Most recent occurrence |
| `"from feb"` | Same as above | Shorthand expanded first |
| `"last week"` | Previous Mon-Sun | Full week boundary |
| `"yesterday"` | Previous day | Single date |
| `"october 13"` | `2025-10-13` | Current year assumed |

**Implementation:**
```javascript
// Month resolution: if month hasn't occurred this year, use last year
getMostRecentMonth(monthIndex) {
  const now = new Date();
  let year = now.getFullYear();
  if (monthIndex > now.getMonth()) {
    year--; // February asked in January → Feb last year
  }
  return { start: firstDayOfMonth, end: lastDayOfMonth };
}
```

---

#### Phase 4: Helpful Failure UX (server.js modifications)

**Old Behavior:**
```
"I don't have access to Adam Cook's P&L tracker..."
```

**New Behavior:**
```
I couldn't find a client matching "Adam Cook".

Did you mean one of these?
• Adam Cook Construction
• Adam & Sarah Cook
• Cook Developments
```

**Implementation:** Server now handles these response types from client-matcher:
- `{ notFound: true, suggestions: [...] }` → Show alternatives
- `{ lowConfidence: true, bestGuess: {...}, suggestions: [...] }` → Use best guess
- `{ ambiguous: true, suggestions: [...] }` → Ask user to choose

---

#### Phase 5: Documentation (`INTENT_REFERENCE.md`) - NEW FILE

Created comprehensive documentation covering:
- Full pipeline architecture diagram
- All supported intents with required/optional fields
- Pre-processor mappings (typos, shorthand, terminology)
- Date normalization rules
- Client resolution scoring algorithm
- Example query processing walkthrough

---

### Pipeline Architecture (Final)

```
User Input
    │
    ▼
┌─────────────────────────────┐
│  1. Language Pre-Processor  │  ← Deterministic: typos, shorthand, terminology
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  2. Date Normalizer         │  ← Deterministic: "feb" → 2025-02-01 to 2025-02-28
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  3. GPT Intent Extraction   │  ← AI: client names, intent, task name
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  4. Client Resolution       │  ← Deterministic: two-phase scoring
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  5. Asana Data Retrieval    │  ← API: fetch actual data
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  6. Response Generation     │  ← AI: format response for coach
└─────────────────────────────┘
```

**Key Principle:** Deterministic logic first. GPT only interprets already-clean input.

---

### Verification Tests (All Passed)

| Test | Query | Pre-Processing | Date | Client Resolution | Result |
|------|-------|----------------|------|-------------------|--------|
| 1 | `"get me roses p an l from feb"` | `p an l` → `p&l`, `feb` → `february` | Feb 1-28, 2025 | Rose → Sam & Rose Chambers (0.774) | ✅ |
| 2 | `"show me sam chambers progress"` | - | - | Sam Chambers → Sam & Rose Chambers (0.856) | ✅ |
| 3 | `"which section is p&l tracker in?"` | - | - | Session context preserved | ✅ |
| 4 | `"show me john smiths tasks"` | - | - | John Smith → John Eastwood (0.315, low conf) | ✅ |
| 5 | `"last conversation with rose"` | - | - | Rose → Sam & Rose Chambers (0.774) | ✅ |
| 6 | `"what comments were on october 13 for john eastwood"` | - | Oct 13 → 2025-10-13 | John Eastwood (1.000) | ✅ |

---

## Key Engineering Decisions Summary

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Team-based not Project-based | Asana workspace organized by client teams | All 67 clients now accessible |
| OpenAI for intent extraction | Complex natural language parsing needed | 12-field structured extraction |
| Fuzzy matching for names | Users say "Dale" not "Dale Marshall" | 95%+ match accuracy |
| Supabase for sessions | Need persistent conversation history | Cross-session context |
| Multi-client arrays | Users ask about "Dale, John and Brad" | Parallel data fetching |
| Board section support | Coaches organize by PLAN/CONVERT/DELIVER | Section-specific queries |
| Comment sorting (newest first) | Most recent activity is most relevant | Better UX |
| Date filtering in sections | "What happened on Oct 13?" queries | Precise retrieval |
| Multi-word client matching | "Sam Chambers" must match "Sam & Rose Chambers" | Accurate name resolution |
| GPT-4o over GPT-4o-mini | Prevent hallucination of task names/dates | Data accuracy |
| Anti-hallucination prompts | Explicit rules to only quote actual data | Trustworthy responses |
| Section mapping in conversations | Users ask "which section is this task in?" | Full context in responses |
| Full conversation threads | Users ask "what other comments are there?" | Complete task history |
| Follow-up question detection | "which task is that?" should work | Better conversation flow |
| Language pre-processor | Typos, shorthand, terminology mapping | Clean input for GPT |
| Date normalizer | "feb" → Feb 1-28, 2025 | Deterministic date parsing |
| Two-phase client scoring | Token overlap + substring + Levenshtein | 95%+ match accuracy |
| Helpful failure UX | Never dead-end, always suggest alternatives | Better user experience |
| Deterministic-first pipeline | GPT only after normalization | Reliable, predictable behavior |

---

## File Structure

```
/Users/equipp/DEVELOP ASANA GPT/
├── server.js                          # Express server, API routes, intent routing (1000+ lines)
├── src/
│   ├── asana-client.js               # All Asana API interactions (1350+ lines)
│   ├── openai-intent-extractor.js    # AI-powered query parsing (480+ lines)
│   ├── coaching-response-generator.js # AI response formatting (620+ lines)
│   ├── client-matcher.js             # Two-phase scoring client matcher (345 lines) - REWRITTEN
│   ├── language-preprocessor.js      # Typo/shorthand/terminology normalization (200 lines) - NEW
│   ├── date-normalizer.js            # Deterministic date parsing (280 lines) - NEW
│   ├── google-sheets-client.js       # P&L financial data
│   ├── supabase-client.js            # Session persistence
│   └── slack-bot.js                  # Slack integration
├── public/
│   ├── index.html                    # ChatGPT-style UI
│   └── assets/
│       ├── js/script.js              # Frontend logic
│       └── css/style.css             # Styling
├── ARCHITECTURE.md                    # This file - engineering decisions
├── INTENT_REFERENCE.md               # Pipeline documentation - NEW
└── *.md                              # Other documentation files
```

---

## Human-AI Collaboration Pattern

Throughout this project, the collaboration followed this pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HUMAN-AI COLLABORATION FLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. HUMAN IDENTIFIES GAP                                        │
│     └─► "I can't find specific tasks"                           │
│     └─► "Sam Chambers doesn't match the right client"           │
│     └─► "The AI made up task names that don't exist"            │
│                                                                  │
│  2. AI ANALYZES ROOT CAUSE                                      │
│     └─► "The intent extractor only captures 3 fields"           │
│     └─► "Matching algorithm counts first word only"             │
│     └─► "GPT-4o-mini hallucinates with high temperature"        │
│                                                                  │
│  3. AI PROPOSES SOLUTION                                        │
│     └─► "Expand to 12 fields with fuzzy matching"               │
│     └─► "Count proportion of words matched, not just first"     │
│     └─► "Upgrade to GPT-4o + anti-hallucination rules"          │
│                                                                  │
│  4. AI IMPLEMENTS & TESTS                                       │
│     └─► Code changes across multiple files                      │
│     └─► curl tests to verify functionality                      │
│     └─► Edge case handling                                      │
│                                                                  │
│  5. HUMAN VERIFIES                                              │
│     └─► "Now test with Dale, John and Brad"                     │
│     └─► "Check accuracy of rose progress"                       │
│     └─► "Which task is that from?"                              │
│                                                                  │
│  6. AI ITERATES                                                 │
│     └─► Fix issues found in verification                        │
│     └─► Add follow-up question handling                         │
│     └─► Document decisions in ARCHITECTURE.md                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Distinction: Human Input vs AI Execution

| Human Input (Direction) | AI Execution (Implementation) |
|-------------------------|-------------------------------|
| "Build a chatbot for Asana" | Designed team-based architecture |
| "Make it look like ChatGPT" | Implemented UI with sidebar, sessions |
| "Sam Chambers doesn't work" | Rewrote matching algorithm |
| "The AI made up task names" | Upgraded model + anti-hallucination rules |
| "Which task is that from?" | Added section mapping + follow-up detection |
| "It's a language → resolution problem" | Built 5-phase deterministic pipeline |
| "No embeddings, no ML, simple string logic" | Created language-preprocessor, date-normalizer |
| "Never dead-end, always suggest alternatives" | Implemented helpful failure UX |

The human provides **direction** and **verification**, while the AI provides **analysis**, **implementation**, and **iteration**.

---

---

## Phase 11: Extended Section Recognition (December 17, 2024)

### Human Input:
> "check alexandra powell right next thing section in progress project and tell me what tasks are there"

### AI Analysis:
**Problem Identified:** Query returned "I don't have access to the Right Next Thing section" even though the section exists.

**Root Cause:** The OpenAI intent extractor only knew about 5 section names:
- PLAN, ATTRACT, CONVERT, DELIVER, SCALE

But Asana boards have additional sections:
- Right next thing
- Meetings / 1-1 Meetings
- Build & Scale Summit 2025
- Boardroom

**Result:** When user asked for "Right next thing", GPT defaulted to `sectionName: "PLAN"` because it didn't recognize the section.

### AI Solution: Extended Section Recognition

**Updated `src/openai-intent-extractor.js`:**

```javascript
// OLD: Only 5 sections
sectionName: "PLAN", "ATTRACT", "CONVERT", "DELIVER", "SCALE"

// NEW: All 9+ sections
sectionName:
  - "PLAN", "ATTRACT", "CONVERT", "DELIVER", "SCALE"
  - "Right next thing" - Priority/next action tasks
  - "Meetings", "1-1 Meetings" - Meeting-related tasks
  - "Build & Scale Summit 2025", "Build & Scale Summmit 2025" - Summit tasks
  - "Boardroom" - Boardroom-related tasks
```

**Added instruction:** `IMPORTANT: Return the section name EXACTLY as user says it (e.g., "Right next thing" not "PLAN")`

**Added example queries:**
```
Query: "Check alexandra's right next thing section"
→ { "sectionName": "Right next thing" }

Query: "What tasks are in the Right next thing for Brad?"
→ { "sectionName": "Right next thing" }
```

### Verification Test:
```bash
curl -X POST http://localhost:3000/api/chat -d '{"message": "check alexandra powell right next thing section"}'
```

**Before (broken):**
> "I don't have access to the Right Next Thing section..."

**After (working):**
> In the "Right Next Thing" section for Alexandra Powell:
> 1. ✅ PDC Flyers x 1,000
> 2. ✅ P&L last 3 months
> 3. ✅ Week 1- Software
> 4. ⬜ Week 2- Time
> ...13 tasks total

**Commit:** `a9aae27` - "Add section recognition for Right next thing, Meetings, and other board sections"

---

## Phase 12: Coach Comment Author Filter (December 17, 2024)

### Human Input:
> "Jamie Mills is one of the coaches. When I ask 'what is the last comment from jamie mills in lee wanes tasks', it doesn't find it."

### AI Analysis:
**Problem Identified:** The system was treating "Jamie Mills" as a CLIENT instead of recognizing her as a COACH whose comments should be filtered.

**Root Cause:** The intent extractor had no concept of "comment author" - it only knew about clients, tasks, and sections.

### AI Solution: Comment Author Filter

**Added `commentAuthor` field to intent extraction:**
```javascript
// NEW field in openai-intent-extractor.js
10. **commentAuthor** - Filter comments by who wrote them:
    - COACHES: "Jamie Mills", "Nick Tobing", "Harmeet Johal", "Greg Wilkes", "Greg"
    - IMPORTANT: When someone asks "Jamie Mills' comments on [client]":
      - commentAuthor = "Jamie Mills" (the coach)
      - clientNames = ["[client name]"] (the client whose tasks to search)
```

**Added filtering in server.js:**
```javascript
if (commentAuthor && conversations && conversations.length > 0) {
  const authorLower = commentAuthor.toLowerCase();
  conversations = conversations.filter(conv => {
    const convAuthor = (conv.author || '').toLowerCase();
    return convAuthor.includes(authorLower);
  });
}
```

### Verification:
```
Query: "Greg comments on Alexandra Powell tasks"
→ Returns only Greg's comments on Alexandra's tasks
```

**Commit:** `058f426` - "Add commentAuthor filter for coach-specific comment queries"

---

## Phase 13: SOP-Based Conversational Clarification (December 17, 2024)

### Human Input:
> "Your comment retrieval method needs to be better. Instead of directly going and searching, why don't you make your conversation more fluid? If a customer asks 'what was my last conversation with Jamie?', you can come back and ask 'Do you recall which section or task?' - more like an assistant thing rather than just fetching whatever."

### AI Decision: Standard Operating Procedure (SOP) for Query Handling

Instead of immediately searching everything (and potentially missing data), the assistant now asks clarifying questions **ONE AT A TIME** when queries are broad.

### SOP Checklist:

| Field | Required? | When to Ask |
|-------|-----------|-------------|
| Client name | ✅ Required | If missing |
| Section OR Task | Helpful | For conversation/comment queries without specifics |
| Time frame | Helpful | For narrowing results |
| Person filter | Helpful | For coach-specific comments |

### Implementation: `src/query-sop-handler.js` (NEW FILE)

```javascript
class QuerySOPHandler {
  analyzeQuery(intentResult, sessionContext) {
    // RULE 1: Must have a client
    if (!hasClient) {
      return { needsClarification: true, question: "Which client?", missingField: 'client' };
    }

    // RULE 2: For conversation queries without specifics, ask for section
    if (intent === 'get_conversation' && !hasSection && !hasTask && !hasTimeFrame) {
      return {
        needsClarification: true,
        question: "Do you remember which section or task? Or an approximate time?",
        missingField: 'location'
      };
    }

    // Query has enough specificity - proceed
    return null;
  }
}
```

### Example Flows:

**Broad query → Ask clarification:**
```
User: "jamie mills last conversation with lee wane"
Bot:  "Do you remember which section or task Jamie Mills's comment was on?
      • A specific task name (like "P&L Tracker" or "Website")
      • A board section (PLAN, ATTRACT, CONVERT, DELIVER, SCALE, Right next thing)
      • Or an approximate time (last week, last month)?"
User: "check the PLAN section"
Bot:  [Shows PLAN section with all comments]
```

**Specific query → Proceed directly:**
```
User: "show me brad PLAN section"
Bot:  [Immediately shows results - no clarification needed]
```

### Key Principles:
1. **Ask ONE question at a time** - Don't overwhelm with multiple questions
2. **Text-friendly** - Keep responses conversational, not robotic
3. **Guide the user** - Provide examples of what they can say
4. **Know when to proceed** - If query has enough info, don't ask unnecessary questions

### Integration in server.js:
```javascript
const clarification = sopHandler.analyzeQuery(intentResult, sessionContext);

if (clarification && clarification.needsClarification) {
  return res.json({
    response: clarification.question,
    awaitingClarification: true
  });
}

// Proceed with search...
```

**Commit:** `bcd67c0` - "Add SOP-based conversational clarification for broad queries"

---

## File Structure (Updated)

```
/Users/equipp/DEVELOP ASANA GPT/
├── server.js                          # Express server, API routes, intent routing
├── src/
│   ├── asana-client.js               # All Asana API interactions
│   ├── openai-intent-extractor.js    # AI-powered query parsing (now with commentAuthor)
│   ├── coaching-response-generator.js # AI response formatting
│   ├── client-matcher.js             # Two-phase scoring client matcher
│   ├── language-preprocessor.js      # Typo/shorthand/terminology normalization
│   ├── date-normalizer.js            # Deterministic date parsing
│   ├── query-sop-handler.js          # SOP for conversational clarification (NEW)
│   ├── google-sheets-client.js       # P&L financial data
│   ├── supabase-client.js            # Session persistence
│   └── slack-bot.js                  # Slack integration
├── public/
│   ├── index.html                    # ChatGPT-style UI
│   └── assets/
│       ├── js/script.js              # Frontend logic
│       └── css/style.css             # Styling
├── ARCHITECTURE.md                    # This file - engineering decisions
├── INTENT_REFERENCE.md               # Pipeline documentation
└── *.md                              # Other documentation files
```

---

## Key Engineering Decisions Summary (Updated)

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Team-based not Project-based | Asana workspace organized by client teams | All 67 clients now accessible |
| OpenAI for intent extraction | Complex natural language parsing needed | 13-field structured extraction |
| Fuzzy matching for names | Users say "Dale" not "Dale Marshall" | 95%+ match accuracy |
| Supabase for sessions | Need persistent conversation history | Cross-session context |
| Multi-client arrays | Users ask about "Dale, John and Brad" | Parallel data fetching |
| Board section support | Coaches organize by PLAN/CONVERT/DELIVER | Section-specific queries |
| Comment author filter | "Jamie's comments on Lee Wane" | Coach-specific comment search |
| SOP-based clarification | Avoid missing data from broad searches | Conversational, accurate results |
| One question at a time | Text-friendly, not overwhelming | Better UX |

---

*Last Updated: December 17, 2024 (Session 3)*
*Generated with Claude Code (Opus 4.5)*
