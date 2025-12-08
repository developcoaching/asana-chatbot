# Quick Start - MVP Build (1-2 Weeks)

**Goal**: Query Asana projects via Slack, get real-time responses
**Status**: Ready to build
**Timeline**: 7-10 days to working MVP

---

## 🎯 Core Flow

```
Coach in Slack:
"What's the status on Brad Goodridge?"
           ↓
    SLACK BOT hears it
           ↓
    Query Router extracts "Brad Goodridge"
           ↓
    Asana Client fetches Brad's project data
           ↓
    Format response (tasks, progress, etc.)
           ↓
    Post to Slack
```

---

## ⚡ Day 1-2: Setup

- [ ] Create `.env.example` with placeholders:
  ```
  ASANA_API_TOKEN=your_token_here
  SLACK_BOT_TOKEN=xoxb-your-token
  SLACK_SIGNING_SECRET=your-secret
  OPENAI_API_KEY=sk-your-key
  ```

- [ ] Create basic `server.js` (Express)
  - Listen on port 3000
  - Health check endpoint: `/health`

- [ ] Create `src/asana-client.js` (Asana wrapper)
  ```javascript
  // Three core methods:
  - getClientProjects() → all projects in workspace
  - getProjectTasks(projectId) → tasks in project
  - getTaskDetails(taskId) → full task data
  ```

- [ ] Test: Can fetch Asana data locally
  ```bash
  node test-asana.js
  ```

---

## ⚡ Day 3-4: Slack Bot Setup

- [ ] Create `src/slack-bot.js` (Slack Bolt)
  - Initialize bot with token + signing secret
  - Listen for `app_mention` events
  - Echo back test message

- [ ] Create `src/server.js` endpoint for Slack
  - POST `/slack/events` → handles Slack requests
  - Verify Slack signatures

- [ ] Test: Mention bot in Slack
  ```
  @bot hello
  → Bot responds: "I hear you!"
  ```

---

## ⚡ Day 5: Query Handling

- [ ] Create `src/query-router.js`
  - Extract client name from message
  - Handle formats: "What's status on Brad?" or "Brad status?"
  - Return: `{ intent: 'CLIENT_STATUS', clientName: 'Brad Goodridge' }`

- [ ] Create `src/client-matcher.js`
  - Match "Brad" → "Brad Goodridge" project in Asana
  - Use fuzzy matching (close enough)
  - Return project ID

- [ ] Test: Parse various messages
  ```javascript
  "What's the status on Brad?" → clientName: "Brad Goodridge"
  "Brad projects?" → clientName: "Brad Goodridge"
  "Tell me about Brad" → clientName: "Brad Goodridge"
  ```

---

## ⚡ Day 6-7: Response Building

- [ ] Create `src/response-formatter.js`
  - Convert Asana task data → readable text
  - Show:
    - Project name
    - Total tasks
    - Completed tasks
    - % complete
    - Top 5 open tasks

  **Example output**:
  ```
  📊 Brad Goodridge
  ━━━━━━━━━━━━━━━━━━━
  Overall: 65% complete (13/20 tasks)

  Open Tasks:
  1. Site inspection approval
  2. Electrical quote review
  3. Client sign-off phase 2

  Overdue: None ✅
  ```

- [ ] Create `src/slack-bot.js` handler
  - Route query → fetch Asana → format → post to Slack

- [ ] Test: Full end-to-end
  ```
  @bot What's the status on Brad?
  → Bot fetches data
  → Posts formatted response
  ```

---

## ⚡ Day 8: Multiple Clients & Edge Cases

- [ ] Handle multiple matches
  ```
  "Status on John?"
  → If multiple Johns, ask: "Did you mean John Smith or John Doe?"
  ```

- [ ] Handle not found
  ```
  "Status on xyz123?"
  → "No project found for xyz123"
  ```

- [ ] Handle errors gracefully
  - Asana API down → "Asana is temporarily unavailable"
  - Network error → "Check your connection"

---

## ⚡ Day 9-10: Testing & Tweaks

- [ ] Test with 5-10 real client projects
  - Verify data accuracy
  - Check response formatting
  - Timing (should be <2 seconds)

- [ ] Create simple test script
  ```bash
  npm run test-queries
  ```
  Runs 10 sample queries, validates responses

- [ ] Fix any bugs found
- [ ] Optimize slow queries

---

## 🚀 MVP Feature Set

### What Works
✅ Query: "What's the status on [client]?"
✅ Response: Project progress, task count, top open items
✅ Multiple clients supported
✅ Error handling
✅ <2 second response time

### What's NOT Included (yet)
❌ Recommendations (Phase 2)
❌ Performance analysis (Phase 2)
❌ AI insights (Phase 2)
❌ Conversation memory (Phase 2)

---

## 📁 File Structure After MVP

```
/Users/equipp/DEVELOP ASANA GPT/
├── .env                          ← Your tokens (never commit)
├── server.js                      ← Main server
├── package.json
│
├── src/
│   ├── slack-bot.js              ← Slack Bolt setup
│   ├── asana-client.js           ← Asana API wrapper
│   ├── query-router.js           ← Parse user input
│   ├── client-matcher.js         ← Match names to projects
│   ├── response-formatter.js     ← Format Asana → Slack
│   └── utils/
│       └── asana-constants.js    ← Project IDs, field IDs
│
└── tests/
    └── test-queries.js           ← Sample queries
```

---

## 🔐 Environment Variables Needed

When ready to test:

```env
# Asana (you already have this in .env)
ASANA_API_TOKEN=your_asana_token_here

# Slack (you'll provide)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-secret

# Optional (for Phase 2)
OPENAI_API_KEY=sk-...

# Server
NODE_ENV=development
PORT=3000
```

---

## 🧪 How to Test Locally

```bash
# Install dependencies
npm install

# Run server
npm start
# Server starts on http://localhost:3000

# In another terminal, test Asana connection
node src/asana-client.js

# When Slack bot is running, mention it in Slack:
@bot What's the status on Brad Goodridge?
```

---

## ⏱️ Timeline Estimate

| Day | What | Status |
|-----|------|--------|
| 1-2 | Setup, Asana client | ⏳ |
| 3-4 | Slack bot, events | ⏳ |
| 5 | Query parsing | ⏳ |
| 6-7 | Response formatting | ⏳ |
| 8 | Edge cases | ⏳ |
| 9-10 | Testing, polish | ⏳ |
| **Total** | **~50 hours** | **Ready in 1-2 weeks** |

---

## 🎯 Success Criteria

When can we say it's working?
- ✅ Bot responds to client status queries
- ✅ Shows accurate task data from Asana
- ✅ Formatted nicely in Slack
- ✅ Handles errors without crashing
- ✅ Response time <2 seconds
- ✅ Multiple clients work
- ✅ Coaches can use it without instructions

---

## 📝 Next Steps

1. **Get Slack credentials** (you'll provide)
   - Create Slack app at https://api.slack.com/apps
   - Get Bot Token & Signing Secret

2. **Start Day 1** (Setup)
   - I'll write `server.js` + `asana-client.js`
   - You provide Slack token

3. **Daily testing**
   - Each day, test what we built
   - Iterate if needed

4. **Launch to Slack** (Day 10)
   - Coaches start testing
   - Gather feedback for Phase 2

---

## 💡 Phase 2 (After MVP Works)

Once MVP is solid, we add:
- AI recommendations ("How can Brad improve?")
- Performance analysis
- Conversation memory
- More query types

But **first**: Get MVP working and tested with real coaches.

---

**Ready to start Day 1?** Let me know when you have Slack credentials! 🚀
