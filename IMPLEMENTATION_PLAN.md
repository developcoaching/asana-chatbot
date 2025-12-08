# Asana Coaching Intelligence Bot for Slack - Implementation Plan

**Project Status**: Discovery Complete ✅
**Date**: December 5, 2025
**Generated from**: Live Asana workspace analysis

---

## 📊 Workspace Analysis Findings

### Structure Overview
- **Workspaces**: 2 (Personal Projects + Develop Coaching)
- **Target Workspace**: "Develop Coaching" (where all 50-60+ coaching clients are)
- **Total Projects**: 184 (mix of client projects + templates)
- **Custom Fields**: 20 defined across workspace

### Identified Components

#### Client Projects
Located in the Develop Coaching workspace. Examples include:
- Brad Goodridge
- The studios white city
- And ~50+ more coaching client projects

#### Project Templates (for consistency)
- TEMPLATE Processes
- TEMPLATE In-Project
- TEMPLATE Projects
- TEMPLATE Pre-Project
- Project Template

#### Workspace Custom Fields (available for all projects)
1. **Priority Fields**:
   - Priority (High, Medium, Low)
   - Priority level? (High priority, Medium priority, Low priority)

2. **Tracking & Status**:
   - Lead status (Contacted, Qualification, Meeting, Proposal, Closed)
   - Sentiment (Positive, Neutral, Negative)
   - Task Progress
   - Feedback type (Question, Comment, Feature request, Bug)
   - Actionable (Yes, No)

3. **Sales-Related**:
   - Next Steps (Sales) (Follow up email, Follow up call, Schedule sales call, etc.)
   - Account name (text field)

4. **Resource & Planning**:
   - Added By / Added by (Greg, Daniel, Angie / Manager, Report)
   - Minutes (number)
   - Effort level? (Low effort, Medium effort, High effort, Need to scope)
   - Estimated value (number)

5. **Work Request Classification**:
   - Type (Work Requests - IT) (Access request, Troubleshooting, etc.)
   - Drawings Required? (Yes - Action, No- already have, No- not needed)
   - To Be Completed By Date (text)

---

## 🏗️ Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      SLACK INTERFACE                             │
│  (Coaches ask questions in Slack, receive AI responses)         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               SLACK BOT (Node.js + Slack Bolt)                   │
│  • Listens for messages                                          │
│  • Handles streaming responses                                   │
│  • Manages conversation threads                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           BACKEND SERVICE (Node.js/Express)                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Query Router & Intent Recognition                        │   │
│  │ (What is the coach asking for?)                         │   │
│  └────┬─────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ├─────────────────────────────────────────────────────┐   │
│       │                                                     │   │
│       ▼                                                     ▼   │
│  ┌──────────────────────┐                         ┌────────────────────┐
│  │ Asana Data Fetcher   │                         │ OpenAI Integration │
│  │ • Client lookup      │                         │ (GPT-4o-mini)     │
│  │ • Task retrieval     │                         │ • Query analysis   │
│  │ • Custom field read  │                         │ • Recommendation  │
│  │ • Performance calc   │                         │   generation       │
│  └─────────┬────────────┘                         │ • Construction    │
│            │                                       │   industry context │
│            └──────────────┬──────────────────────┘
│                           │
│       ┌───────────────────┴───────────────────┐
│       │                                       │
│       ▼                                       ▼
│  ┌─────────────────────┐         ┌──────────────────────┐
│  │ Data Aggregator     │         │ Prompt Orchestrator  │
│  │ • Combine Asana +   │         │ • Build smart        │
│  │   OpenAI insights   │         │   prompts            │
│  │ • Format response   │         │ • Context injection  │
│  └──────────┬──────────┘         └──────────────────────┘
│             │
│             ▼
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
                   Response to Slack
```

### Data Flow for Coach Query

**Example: "What's the status on Brad Goodridge?"**

1. **Slack Input** → Coach types query in Slack
2. **Bot Receives** → Query arrives at backend
3. **Intent Detection** → Bot identifies: Query type = "CLIENT_STATUS"
4. **Asana Fetch** → Retrieve Brad Goodridge project data:
   - Project overview
   - Task completion %
   - Custom field values (Priority, Effort, Progress)
   - Recent updates/notes
5. **Data Analysis** → OpenAI analyzes the data in context
6. **Response Generation** → Bot creates natural language response with:
   - Current project status
   - Key metrics (% complete, on-time rate)
   - Risk flags (overdue tasks, high-effort pending)
   - Recommendations for improvement
7. **Slack Output** → Streaming response delivered to coach

---

## 🎯 Planned Features (MVP)

### Phase 1: Core Functionality

#### 1. Client Status Queries
**User**: "What's the status on [Client Name]?"
**Bot Response**:
```
📊 Brad Goodridge - Project Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Progress: 65% Complete
Active Tasks: 12
On-Time Completion: 92%
Overdue Tasks: 1

Top Priority Work:
• Task 1: [description] - High Priority
• Task 2: [description] - Medium Priority

Recent Updates:
• Updated 2 hours ago
• Next phase starts on Dec 12
```

#### 2. Task Analysis
**User**: "What's overdue for Brad?"
**Bot Response**:
```
⏰ Overdue Tasks - Brad Goodridge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1 task is overdue:

📌 Site inspection report
   Due: Dec 2 (3 days overdue)
   Status: In Progress
   Assigned to: [Name]
   Impact: Blocks handover approval

✅ Recommended Action: Schedule completion call
```

#### 3. Performance Insights
**User**: "How is Brad performing?"
**Bot Response**:
```
📈 Performance Analysis - Brad Goodridge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Velocity: On track
On-Time Delivery: 92% (Good)
Effort Allocation: 68% high-effort tasks
Bottleneck: Approvals taking 2-3 days

Strengths:
✅ Fast task execution (avg 1.2 days)
✅ High engagement

Areas for Improvement:
⚠️ Dependency on external approvals
⚠️ New tasks added 40% more than completed this week
```

#### 4. Smart Recommendations
**User**: "How can Brad improve?"
**Bot Response**:
```
💡 Recommendations for Brad Goodridge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For a UK/Australian construction company, focus on:

1. Approval Workflow
   Construction projects often get stuck on approvals.
   → Suggest: Batch approvals on Monday mornings
   → Set 24-hr approval SLA for non-critical items

2. Resource Planning
   High-effort tasks clustering at end of month
   → Suggest: Spread work more evenly (aim for 50/50 high/low)
   → Consider: Bring in contractors for Dec 15-20 surge

3. Team Communication
   Sales tasks show "Closed" but no follow-up
   → Suggest: Add post-project feedback session
   → Track: Client satisfaction scores

Expected Impact:
🎯 Improve on-time delivery from 92% → 96%+
🎯 Reduce approval delays by 30%
```

#### 5. Conversational Context
**User**: "Tell me more about the delays"
**Bot** (remembers previous context):
```
Going deeper into the delays for Brad Goodridge...
[Detailed analysis of approval bottlenecks]
```

### Phase 2: Advanced Features (Post-MVP)
- **Comparative Analysis**: "Compare Brad to the team average"
- **Trend Tracking**: "Show me Brad's progress over the last month"
- **Bulk Insights**: "Give me a 2-minute standup on all clients"
- **Alert System**: "Alert me when any client falls below 80% on-time delivery"
- **Goal Setting**: "Set a deadline of Dec 20 for Brad's project"
- **Capacity Planning**: "Which clients need help next week?"

---

## 🛠️ Implementation Details

### Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Slack Integration | Slack Bolt (Node.js) | Best-in-class SDK, streaming support |
| Backend Server | Express.js + Node.js | Lightweight, perfect for API orchestration |
| Asana Integration | Native Asana API (REST) | Reliable, well-documented |
| AI/LLM | OpenAI GPT-4o-mini | Fast, cost-effective, context-aware |
| Data Storage | In-memory + optional Redis | For conversation context, client cache |
| Hosting | Can run locally or cloud | Flexible options (Heroku, AWS Lambda, etc.) |
| Environment | `.env` file for secrets | Secure token management |

### Key Files to Create

**Core**:
- `src/slack-bot.js` - Main Slack bot with Bolt
- `src/asana-client.js` - Asana API wrapper
- `src/openai-integration.js` - OpenAI query handling
- `src/query-router.js` - Intent detection & routing
- `src/response-generator.js` - Format responses for Slack
- `src/server.js` - Express backend

**Utilities**:
- `src/utils/cache.js` - Client data caching
- `src/utils/construction-context.js` - Industry-specific knowledge
- `src/utils/performance-analyzer.js` - Calculate metrics from Asana data

**Configuration**:
- `.env.example` - Template for environment variables
- `.gitignore` - Prevent token leaks
- `package.json` - Dependencies

---

## 🚀 Development Roadmap

### Week 1: Foundation
- [ ] Set up Slack Bot with Bolt
- [ ] Create Asana API wrapper class
- [ ] Implement basic message handler
- [ ] Deploy to Slack workspace

### Week 2: Core Features
- [ ] Implement client status queries
- [ ] Add task analysis ("what's overdue?")
- [ ] Build performance insight engine
- [ ] Add construction industry context

### Week 3: Intelligence
- [ ] Integrate OpenAI for smart recommendations
- [ ] Implement conversation memory
- [ ] Add streaming responses for better UX
- [ ] Test with real coaches

### Week 4: Polish
- [ ] Error handling & resilience
- [ ] Rate limiting for Asana/OpenAI
- [ ] Caching for performance
- [ ] Documentation & deployment guide

---

## 💰 API Costs Estimate (MVP)

**Monthly Usage** (assuming 50 clients, 20 queries/day):

| Service | Usage | Cost |
|---------|-------|------|
| **Asana API** | Unlimited (admin access) | $0 |
| **OpenAI** | ~15K tokens/day | ~$3-5/month |
| **Slack** | Unlimited | $12.50/month (Pro) |
| **Hosting** | ~2GB memory | $5-20/month |
| **TOTAL** | | **~$20-38/month** |

Very cost-effective! Main cost is Slack Pro licensing for the workspace.

---

## 🔒 Security Considerations

1. **Token Management**:
   - Asana token stored in `.env` (never committed)
   - OpenAI key in `.env` (never committed)
   - Slack signing secret in `.env`

2. **Data Access**:
   - Only coaches in Slack workspace can query
   - Bot has read-only access to Asana (no modifications)
   - Consider rate limiting per coach

3. **Privacy**:
   - No client data stored permanently
   - Conversation context cleared after session
   - Option to audit all queries (for compliance)

---

## 🎓 Next Steps to Start Building

1. **Slack App Setup**
   - Go to https://api.slack.com/apps
   - Create new app ("Develop Coaching Bot")
   - Install to Slack workspace
   - Get bot token & signing secret

2. **Local Development**
   ```bash
   cd /Users/equipp/DEVELOP\ ASANA\ GPT
   npm install slack-bolt axios openai dotenv express
   ```

3. **Create First Handler**
   - Listen for "hello" messages
   - Test bot is working in Slack

4. **Asana Integration**
   - Test data fetching with your first real client project
   - Build query response formatter

5. **OpenAI Integration**
   - Start with simple prompts (no industry context)
   - Test response streaming in Slack

---

## 📝 Questions to Confirm

Before we start coding, let me confirm a few implementation details:

1. **Slack Workspace Ready?**
   - Do you have admin access to Slack workspace where coaches are?
   - Should bot be in a private channel or available everywhere?

2. **Client Identification**:
   - How should the bot identify which Asana project = which client?
   - Is the project name = client name? (e.g., "Brad Goodridge" = Brad's project)
   - Any naming conventions to follow?

3. **Which Custom Fields Matter Most?**
   - Looking at your 20 fields, which 5-7 are most important for coaching decisions?
   - Should recommendations focus on specific fields?

4. **Industry Context**:
   - Should the bot be aware of typical construction project phases?
   - Any industry-specific metrics coaches care about?

5. **Conversation Summaries**:
   - Where are these stored in Asana? (Task descriptions? Notes? Separate field?)
   - How should the bot incorporate them into recommendations?

---

## ✅ Status Summary

| Item | Status | Notes |
|------|--------|-------|
| **Asana Auth** | ✅ Verified | Token works, can access Develop Coaching workspace |
| **Workspace Structure** | ✅ Mapped | 184 projects, 20 custom fields identified |
| **Data Quality** | ✅ Good | Client projects mixed with templates, need naming convention |
| **API Capabilities** | ✅ Confirmed | Full read access to all data |
| **Architecture** | ✅ Designed | Technology stack selected, flow documented |
| **Cost Analysis** | ✅ Favorable | ~$20-38/month for MVP |
| **Slack Integration** | ⏳ Ready to start | Need workspace access to set up bot |

---

## 📌 Key Decisions Made

1. **Slack Bot (not modal/workflow)**: More natural, ChatGPT-like conversational experience ✅
2. **OpenAI GPT-4o-mini**: Fast, affordable, perfect for contextual recommendations ✅
3. **Read-only access to Asana**: Safe approach, no risk of data modification ✅
4. **Industry-specific context**: Construction metrics & best practices built into prompts ✅
5. **Streaming responses**: Better UX, feels more responsive like ChatGPT ✅

---

**Ready to proceed with implementation? Let me know the answers to the 5 questions above, and we'll start building!**
