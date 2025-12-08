# Task List - Asana Coach Intelligence Bot for Slack

**Project**: Asana Coaching Bot | **Status**: Discovery Complete → Development Ready
**Last Updated**: December 5, 2025

---

## 🎯 Phase 1: Foundation (Week 1-2) - MVP Setup

### Week 1 Tasks

#### 1.1 Slack App Configuration
- [ ] Create new Slack App on https://api.slack.com/apps
  - Name: "Develop Coaching Bot"
  - Workspace: [Your coaching Slack workspace]
- [ ] Configure OAuth & Permissions
  - [ ] Add scopes: `chat:write`, `app_mentions:read`, `messages:read`
  - [ ] Generate Bot Token (save to `.env` as `SLACK_BOT_TOKEN`)
  - [ ] Generate Signing Secret (save to `.env` as `SLACK_SIGNING_SECRET`)
- [ ] Install app to workspace
- [ ] Test: Bot can post test message in #general

**Files to Create**:
- `src/slack-bot.js` - Slack Bolt initialization
- Update `.env.example` with new variables

#### 1.2 Asana API Wrapper
- [ ] Create `src/asana-client.js`
  - [ ] Initialize with `ASANA_API_TOKEN` from `.env`
  - [ ] Implement core methods:
    - `getProjectById(projectId)` - Fetch single project
    - `getTasksByProject(projectId)` - Get all tasks in project
    - `getClientProjects()` - List all client projects
    - `getTaskDetails(taskId)` - Full task with custom fields
  - [ ] Add error handling & logging
- [ ] Test: Can fetch Brad Goodridge project data
- [ ] Create `src/utils/asana-constants.js`
  - [ ] Map workspace/project IDs
  - [ ] Document custom field IDs for easy reference

**Files to Create**:
- `src/asana-client.js`
- `src/utils/asana-constants.js`

#### 1.3 Express Backend Setup
- [ ] Create `src/server.js`
  - [ ] Initialize Express app
  - [ ] Set up request logging
  - [ ] Health check endpoint (`GET /health`)
- [ ] Create `src/slack-bot.js` main handler
  - [ ] Listen for app_mentions
  - [ ] Echo back test message
- [ ] Test locally: `npm start` works without errors

**Files to Create**:
- `src/server.js`
- `src/slack-bot.js` (basic version)

#### 1.4 Query Router
- [ ] Create `src/query-router.js`
  - [ ] Parse coach message
  - [ ] Detect intent:
    - `CLIENT_STATUS` - "What's the status on [client]?"
    - `TASK_STATUS` - "What tasks are [status]?"
    - `PERFORMANCE` - "How is [client] performing?"
    - `HELP` - "Help" or "?" message
  - [ ] Extract client name
- [ ] Test: Can identify intent types

**Files to Create**:
- `src/query-router.js`
- `tests/query-router.test.js`

### Week 2 Tasks

#### 2.1 Response Generator (Basic)
- [ ] Create `src/response-generator.js`
  - [ ] Format Asana data into readable Slack messages
  - [ ] Create response templates:
    - Client status (% complete, task count, etc.)
    - Task list (organized by status)
    - Performance metrics
  - [ ] Add emoji/formatting for clarity
- [ ] Test: Generates readable Slack messages

**Files to Create**:
- `src/response-generator.js`
- `tests/response-generator.test.js`

#### 2.2 CLIENT_STATUS Query Handler
- [ ] Create handler in `src/slack-bot.js`
  1. Extract client name from message
  2. Call `asana-client.getClientProjects()`
  3. Match project name to client
  4. Fetch project data
  5. Generate response
  6. Post to Slack thread
- [ ] Test with real client: "What's the status on Brad Goodridge?"
- [ ] Test edge cases: Misspelled names, multiple matches

**Files to Create/Modify**:
- `src/slack-bot.js` (add handler)
- `src/utils/client-matcher.js` (fuzzy match client names)

#### 2.3 Environment & Deployment Setup
- [ ] Create `.env.example`
  ```
  ASANA_API_TOKEN=your_token_here
  SLACK_BOT_TOKEN=xoxb-...
  SLACK_SIGNING_SECRET=...
  OPENAI_API_KEY=sk-...
  NODE_ENV=development
  PORT=3000
  ```
- [ ] Update `.gitignore` - confirm `.env` is excluded
- [ ] Create deployment guide (README section or separate doc)
- [ ] Test: App runs locally on localhost:3000

**Files to Create/Modify**:
- `.env.example` (update)
- `.gitignore` (verify)
- `docs/DEPLOYMENT.md` (new)

#### 2.4 Phase 1 Testing
- [ ] Integration test: Full flow from Slack → Asana → Response
  - [ ] Test with 3 different clients
  - [ ] Test with misspelled names
  - [ ] Test error scenarios
- [ ] Load test: Simulate 5 concurrent queries
- [ ] Document test results

**Files to Create**:
- `tests/integration.test.js`
- `tests/performance.test.js`

#### 2.5 Phase 1 Documentation
- [ ] Update `README.md` with Phase 1 completion notes
- [ ] Create `docs/PHASE1_RESULTS.md`
  - [ ] What works
  - [ ] Known limitations
  - [ ] Next phase requirements
- [ ] Record 2-min demo video (optional, for team)

---

## 🧠 Phase 2: Intelligence (Week 3) - AI Integration

### Performance Analysis Engine
- [ ] Create `src/utils/performance-analyzer.js`
  - [ ] Calculate metrics:
    - % task completion
    - On-time delivery rate
    - Average task duration
    - High-effort vs low-effort ratio
  - [ ] Compare to baseline/previous period
  - [ ] Flag anomalies (e.g., tasks taking 3x normal time)

**Files to Create**:
- `src/utils/performance-analyzer.js`
- `tests/performance-analyzer.test.js`

### OpenAI Integration
- [ ] Create `src/openai-integration.js`
  - [ ] Initialize OpenAI client with `OPENAI_API_KEY`
  - [ ] Build prompt templates for:
    - Performance analysis
    - Recommendation generation
    - Construction industry context
  - [ ] Implement streaming responses
  - [ ] Add fallback (if OpenAI fails, return Asana data as-is)
- [ ] Test: Generate recommendations for sample client data

**Files to Create**:
- `src/openai-integration.js`
- `src/prompts/performance-analysis.prompt.js`
- `src/prompts/recommendations.prompt.js`
- `tests/openai-integration.test.js`

### Construction Industry Context
- [ ] Create `src/utils/construction-context.js`
  - [ ] Define UK/Australian construction benchmarks:
    - Typical project approval times
    - Industry standard on-time rates
    - Common bottlenecks
  - [ ] Seasonal considerations (weather impacts)
  - [ ] Regulatory compliance notes
- [ ] Integrate into OpenAI prompts

**Files to Create**:
- `src/utils/construction-context.js`
- `docs/CONSTRUCTION_CONTEXT.md`

### PERFORMANCE & RECOMMENDATION Handlers
- [ ] Add to `src/slack-bot.js`:
  - [ ] "How is [client] performing?" query
  - [ ] "How can [client] improve?" query
  - [ ] Streaming response support (shows response as it's generated)
- [ ] Test: Generate recommendations for real clients
- [ ] Validate: Recommendations make sense for construction industry

**Files to Modify**:
- `src/slack-bot.js` (add handlers)
- `tests/slack-bot.test.js`

### Conversation Memory
- [ ] Create `src/utils/conversation-cache.js`
  - [ ] Store last 5 queries per coach
  - [ ] Enable follow-ups: "Tell me more" = continue previous topic
  - [ ] Optional: Persist to Redis for production
- [ ] Integrate into query router
- [ ] Test: Multi-turn conversation works

**Files to Create**:
- `src/utils/conversation-cache.js`
- `tests/conversation-cache.test.js`

---

## 🎨 Phase 3: Polish (Week 4) - Production Ready

### Error Handling & Resilience
- [ ] Comprehensive error handling:
  - [ ] Asana API failures → graceful fallback
  - [ ] OpenAI timeouts → use cached data
  - [ ] Invalid client names → helpful suggestions
  - [ ] Rate limiting → queue requests
- [ ] Add logging framework (Winston or Pino)
- [ ] Create error response templates for Slack

**Files to Create**:
- `src/utils/error-handler.js`
- `src/utils/logger.js`
- `docs/ERROR_HANDLING.md`

### Caching & Performance
- [ ] Implement data caching:
  - [ ] Cache client projects (TTL: 1 hour)
  - [ ] Cache task data (TTL: 15 minutes)
  - [ ] Cache custom field definitions (TTL: 24 hours)
- [ ] Add cache invalidation endpoints
- [ ] Monitor: Log cache hit/miss ratios

**Files to Create**:
- `src/utils/cache.js`
- `tests/cache.test.js`

### Rate Limiting
- [ ] Configure rate limits:
  - [ ] Asana API: 100 req/min (per rate limit)
  - [ ] OpenAI API: 20 req/min (per quota)
  - [ ] Per-coach: 10 queries/min
- [ ] Queue excessive requests
- [ ] Notify coach when rate limited

**Files to Create**:
- `src/utils/rate-limiter.js`
- `docs/RATE_LIMITING.md`

### Testing & QA
- [ ] Write unit tests:
  - [ ] 80%+ code coverage
  - [ ] All query types
  - [ ] Error scenarios
- [ ] Integration tests:
  - [ ] End-to-end flows
  - [ ] With real Asana data
  - [ ] With mock OpenAI
- [ ] UAT: Have coaches test for 1 week
  - [ ] Collect feedback
  - [ ] Bug fixes
  - [ ] UX improvements

**Files to Create**:
- `tests/` (comprehensive suite)
- `docs/TESTING.md`

### Documentation & Deployment
- [ ] Production deployment guide
- [ ] Setup instructions for new workspaces
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] Create runbook for common issues

**Files to Create**:
- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/SETUP_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/RUNBOOK.md`

### Launch Checklist
- [ ] Security review (no hardcoded keys, HTTPS only)
- [ ] Performance verified (responses < 3 seconds)
- [ ] Error handling tested
- [ ] Rate limiting verified
- [ ] Slack workspace admin approval
- [ ] Coaches trained on usage
- [ ] Launch to limited group (5-10 coaches)
- [ ] Monitor for 1 week
- [ ] Rollout to full team

---

## 🔄 Phase 4: Advanced Features (Post-MVP)

- [ ] Comparative analysis ("Compare Brad to team average")
- [ ] Trend tracking ("Show me Brad's progress over last month")
- [ ] Bulk insights ("Give me standup on all clients")
- [ ] Alert system ("Alert me if anyone falls below 80% on-time")
- [ ] Goal setting ("Set Dec 20 deadline for Brad")
- [ ] Capacity planning ("Who needs help next week?")
- [ ] Coaching templates ("Standard questions to ask Brad")
- [ ] Export reports (PDF/CSV of client performance)

---

## 🔐 Security & Compliance

- [ ] Security review checklist
  - [ ] No API keys in code ✅ (stored in .env only)
  - [ ] HTTPS only for production
  - [ ] Slack webhook validation
  - [ ] Rate limiting prevents abuse
  - [ ] Audit logging for compliance
- [ ] GDPR compliance check (if applicable)
- [ ] Data retention policy (how long to keep conversations?)
- [ ] Access control (which coaches can see which clients?)

---

## 📊 Metrics & Success Criteria

### Phase 1 Success
- ✅ Bot responds to 3 basic queries
- ✅ < 2 second response time
- ✅ 0 crashes during 8-hour test
- ✅ Coaches find it easy to use

### Phase 2 Success
- ✅ Recommendations make sense
- ✅ Coaches prefer AI suggestions over manual analysis
- ✅ Conversation context works (follow-ups work)

### Phase 3 Success
- ✅ 99% uptime
- ✅ < 1% error rate
- ✅ Full team adoption
- ✅ Measurable coaching time savings (>2 hours/week)

---

## 📅 Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| **Phase 1** | Weeks 1-2 | ✅ MVP working |
| **Phase 2** | Week 3 | 🧠 AI integration live |
| **Phase 3** | Week 4 | 🚀 Production ready |
| **Phase 4** | Ongoing | ⭐ Advanced features |

**Total**: 4 weeks to MVP + production
**Launch**: Mid-December 2025

---

## 🤝 Dependencies

**Before Phase 1 Starts, Need**:
- ✅ Asana API token (have it)
- ⏳ Slack app credentials (need to create)
- ⏳ OpenAI API key (need to get)
- ⏳ Answer 5 clarification questions

**Blockers**:
- None identified yet

---

## 📝 Notes

- All API keys stored ONLY in `.env` file
- `.env` is in `.gitignore` - never committed to GitHub
- Use `.env.example` to show required variables
- Reference env variables by name in all code (never hardcode values)
- Every Phase has documentation checkpoint

---

## ✅ Completion Checklist

- [ ] Phase 1 complete + tested
- [ ] Phase 2 complete + coaches testing
- [ ] Phase 3 complete + production ready
- [ ] All documentation written
- [ ] Team trained
- [ ] Metrics dashboard created
- [ ] Runbook reviewed
- [ ] Ready for scaling to Phase 4
