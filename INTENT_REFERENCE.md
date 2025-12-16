# Intent Schema Reference

## Pipeline Architecture

```
User Input
    │
    ▼
┌─────────────────────────────┐
│  1. Language Pre-Processor  │  ← Deterministic: typos, shorthand, terminology
│     (language-preprocessor.js)
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  2. Date Normalizer         │  ← Deterministic: "feb" → 2025-02-01 to 2025-02-28
│     (date-normalizer.js)
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  3. GPT Intent Extraction   │  ← AI: client names, intent, task name
│     (openai-intent-extractor.js)
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  4. Client Resolution       │  ← Deterministic: two-phase scoring
│     (client-matcher.js)
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  5. Asana Data Retrieval    │  ← API: fetch actual data
│     (asana-client.js)
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  6. Response Generation     │  ← AI: format response for coach
│     (coaching-response-generator.js)
└─────────────────────────────┘
```

---

## Intents (All Supported)

| Intent | Description | Required Fields | Optional Fields |
|--------|-------------|-----------------|-----------------|
| `get_status` | Overall client progress | clientNames | timeRange |
| `get_conversation` | Recent comments/discussions | clientNames | timeRange, taskName |
| `get_comment` | Specific comments | clientNames, taskName | specificDate, timeRange |
| `get_task` | Specific task details | clientNames, taskName | projectName |
| `get_project` | Project info | clientNames, projectName | - |
| `get_section` | Board section tasks | clientNames, sectionName | taskName, specificDate |
| `get_board` | Full board structure | clientNames | projectName |
| `search_tasks` | Keyword search | clientNames, searchKeywords | taskStatus |
| `list_projects` | All client projects | clientNames | - |
| `compare` | Compare multiple clients | clientNames (2+) | - |
| `create_task` | Create new task | clientNames, actionData.name | actionData.notes, actionData.due_on |
| `update_task` | Update task | clientNames, taskName, actionData | - |
| `add_comment` | Add comment to task | clientNames, taskName, actionData.text | - |

---

## Intent Schema Fields

```javascript
{
  // REQUIRED
  clientNames: string[],     // ["Dale", "John", "Brad"] - supports arrays
  intent: string,            // One of the intents above

  // OPTIONAL - Used by specific intents
  clientName: string,        // Legacy single-client field
  taskName: string,          // e.g., "P&L Tracker", "MAPs"
  projectName: string,       // e.g., "Progress", "Meetings"
  sectionName: string,       // e.g., "PLAN", "ATTRACT", "CONVERT", "DELIVER", "SCALE"
  specificDate: string,      // ISO format: "2025-02-15" (populated by date-normalizer)
  timeRange: string,         // "last_week", "last_month", "february", etc.
  searchKeywords: string[],  // ["cashflow", "invoice"]
  taskStatus: string,        // "completed", "open", "overdue"
  assignee: string,          // "Jamie", "Greg"
  actionData: object,        // For write operations: { name, notes, text, due_on }

  // INTERNAL (added by pipeline)
  dateRange: {               // Added by date-normalizer for range queries
    start: string,           // "2025-02-01"
    end: string,             // "2025-02-28"
    label: string            // "february"
  }
}
```

---

## Phase 1: Language Pre-Processor

**File:** `src/language-preprocessor.js`

### Typo Corrections (TYPO_MAP)

```javascript
{
  'priovate': 'private',
  'accounr': 'account',
  'converstaion': 'conversation',
  'coment': 'comment',
  'progres': 'progress',
  'sectoin': 'section',
  'taks': 'task',
  'febuary': 'february',
  // ... 30+ more
}
```

### Shorthand Expansions (SHORTHAND_MAP)

```javascript
{
  'p an l': 'p&l',
  'pnl': 'p&l',
  'feb': 'february',
  'jan': 'january',
  'convo': 'conversation',
  'msg': 'message',
  // ... 20+ more
}
```

### Terminology Rewrites (TERM_MAP)

```javascript
{
  'private user': 'client commenter',
  'on rose\'s account': 'tasks under rose chambers',
  'last convo': 'last conversation',
  'whats up with': 'status of',
  'catch me up on': 'status of',
  // ... 10+ more
}
```

---

## Phase 2: Date Normalizer

**File:** `src/date-normalizer.js`

### Locked Defaults

| Input | Output | Rule |
|-------|--------|------|
| `"february"` | Feb 1-28, 2025 | Most recent occurrence of month |
| `"feb"` | Feb 1-28, 2025 | Shorthand expanded first |
| `"last week"` | Previous Mon-Sun | Full week boundary |
| `"yesterday"` | Previous day | Single date |
| `"recent"` | Last 7 days | Default range |
| `"October 13"` | 2025-10-13 | Current year assumed |
| `"Oct 13, 2024"` | 2024-10-13 | Explicit year |

### Month Resolution Logic

```javascript
// If month hasn't occurred yet this year, use last year
// Example: Today is December 2025
// "February" → Feb 2025 (already passed)
// "March" → March 2025 (already passed)

// If month is in the future:
// "February" (asked in Jan 2025) → Feb 2024
```

---

## Phase 3: Client Resolution

**File:** `src/client-matcher.js`

### Scoring Algorithm

| Signal | Weight | Description |
|--------|--------|-------------|
| Token Overlap | 40% | How many query words appear in target |
| Substring Match | 35% | Query contained in target or vice versa |
| Levenshtein | 25% | Edit distance similarity |

### Decision Logic

| Score | Action |
|-------|--------|
| ≥ 0.7 | Auto-select (high confidence) |
| 0.5-0.7 with close 2nd | Return ambiguous with suggestions |
| 0.3-0.7 | Return low confidence with suggestions |
| < 0.3 | Return not found with suggestions |

### Noise Words (Stripped for Matching)

```javascript
['construction', 'builders', 'building', 'developments',
 'ltd', 'llc', 'llp', 'inc', 'co', 'company', 'group',
 'services', 'solutions', 'enterprises', 'holdings',
 'the', 'and', '&']
```

---

## Phase 4: Failure UX

### Client Not Found Response

```
I couldn't find a client matching "Adam Cook".

Did you mean one of these?
• Adam Cook Construction
• Adam & Sarah Cook
• Cook Developments
```

### Ambiguous Match Response

```
I found multiple possible matches for "Cook":
• Adam Cook
• Sarah Cook
• Cook Developments

Which one did you mean?
```

### Low Confidence Response

Uses best guess but may note uncertainty in response.

---

## Board Sections (Known)

The coaching system uses these board sections:

| Section | Purpose |
|---------|---------|
| PLAN | Planning tasks: MAPs, P&L Tracker, Roadmap |
| ATTRACT | Marketing tasks |
| CONVERT | Sales tasks: Website, Estimates |
| DELIVER | Operations: Software, Change orders |
| SCALE | Growth tasks |
| Right Next Thing | Priority tasks |
| Meetings | Meeting notes |
| Boardroom | Strategy discussions |

---

## Example Query Processing

### Input
```
"get me adam cooks p an l comment from feb"
```

### Phase 1: Pre-process
```
"get me adam cooks p&l comment from february"
```

### Phase 2: Date Normalize
```
dateRange: { start: "2025-02-01", end: "2025-02-28", label: "february" }
```

### Phase 3: Intent Extract (GPT)
```javascript
{
  clientNames: ["Adam Cook"],
  intent: "get_comment",
  taskName: "P&L",
  timeRange: "february"
}
```

### Phase 4: Client Resolve
```
"Adam Cook" → "Adam Cook" (score: 1.000, auto-selected)
```

### Phase 5: Retrieve
```
- Find team "Adam Cook"
- Find task "P&L Tracker"
- Get comments from Feb 2025
```

### Phase 6: Generate Response
```
"Here are the P&L Tracker comments for Adam Cook from February 2025..."
```

---

*Last Updated: December 16, 2024*
