# Asana Coach Intelligence Bot for Slack

A Slack-integrated AI chatbot that enables construction industry coaches to have intelligent conversations about their clients using real-time Asana data.

**Status**: 🔵 Discovery Phase Complete - Ready for Development

---

## 📋 Quick Summary

This project will create a conversational AI bot in Slack that:
1. **Understands** coach questions about their clients ("What's the status on Brad?")
2. **Fetches** real-time data from Asana (tasks, progress, custom fields)
3. **Analyzes** client performance using industry-specific metrics
4. **Recommends** actions to improve delivery based on construction best practices
5. **Responds** naturally in Slack like ChatGPT

**Key Insight**: Your Asana workspace is perfectly structured with 184 projects and 20 custom fields - we just need to connect it to a conversational AI interface.

---

## 🏗️ Project Files

### Exploration & Analysis ✅
- `explore-asana.js` - Initial workspace scanner
- `debug-asana.js` - API debugging tool
- `explore-workspace.js` - Detailed Develop Coaching workspace analysis
- `IMPLEMENTATION_PLAN.md` - **← Start here** Full architecture & roadmap

### Configuration
- `.env` - Your Asana API token (NEVER commit this)
- `.gitignore` - Prevents sensitive files from being pushed
- `package.json` - Node.js dependencies

---

## 🚀 Getting Started

### 1. Read the Plan
Open `IMPLEMENTATION_PLAN.md` to understand:
- Complete system architecture
- Feature examples (how coaches will use it)
- Technical stack & cost estimates
- Development roadmap
- 5 clarifying questions we should answer

### 2. Answer the Key Questions
Before coding, clarify:
1. Slack workspace setup status
2. How to identify client projects
3. Most important custom fields
4. Industry-specific context preferences
5. Where conversation summaries are stored

### 3. Set Up Slack Bot
```bash
# When ready to start building:
npm install slack-bolt axios openai
```

### 4. Start with Phase 1
- Set up Slack bot message listener
- Create Asana data fetcher
- Implement "client status" query
- Test with a real coach

---

## 📊 What We Know

### Your Asana Workspace
| Metric | Value |
|--------|-------|
| Workspace | "Develop Coaching" |
| Total Projects | 184 |
| Estimated Client Projects | 50-60 |
| Custom Fields | 20 |
| Authentication | ✅ Verified |

### Available Data
- ✅ Client project tasks & status
- ✅ Task progress & completion rates
- ✅ Custom fields (Priority, Progress, Sales status, etc.)
- ✅ Task assignments & timelines
- ✅ Project-level metrics

### Technology Stack
- **Slack Integration**: Slack Bolt (Node.js)
- **Backend**: Express.js
- **Asana API**: Native REST API
- **AI**: OpenAI GPT-4o-mini
- **Hosting**: Flexible (local or cloud)

### Cost Estimate (Monthly)
- Asana: $0 (admin access)
- OpenAI: $3-5 (cheap model)
- Slack: $12.50 (Pro plan)
- Hosting: $5-20
- **Total: ~$20-38/month**

---

## 🎯 Vision Example

**Coach in Slack**: "Hey bot, what's the status on Brad Goodridge?"

**Bot Response**:
```
📊 Brad Goodridge - Project Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Progress: 65% Complete
On-Time Delivery Rate: 92%
Overdue Tasks: 1 (site inspection - 3 days late)

Top Priority Work:
• Electrical work approval - High Priority - Due Dec 8
• Client sign-off on phase 2 - Medium Priority - Due Dec 12

Key Insight:
Your approval process is adding 2-3 days per task.
For UK construction companies, the industry average is 1 day.

💡 Recommendation:
Suggest Brad implement daily approval windows (10am & 3pm)
Expected improvement: Get back to 95%+ on-time rate

Conversation continues naturally from here...
```

---

## 📁 Directory Structure (Post-Development)

```
/Users/equipp/DEVELOP ASANA GPT/
├── .env                          # Your tokens (NEVER commit)
├── .gitignore                    # Protect .env
├── package.json                  # Dependencies
├── IMPLEMENTATION_PLAN.md        # Architecture & roadmap
├── README.md                     # This file
│
├── src/
│   ├── slack-bot.js             # Slack Bolt setup & handlers
│   ├── asana-client.js          # Asana API wrapper
│   ├── openai-integration.js    # OpenAI queries
│   ├── query-router.js          # Intent detection
│   ├── response-generator.js    # Format Slack responses
│   ├── server.js                # Express backend
│   │
│   └── utils/
│       ├── cache.js             # Client data caching
│       ├── construction-context.js  # Industry knowledge
│       └── performance-analyzer.js  # Metrics calculation
│
├── tests/                        # Unit & integration tests
├── docs/                         # Additional documentation
│
└── Exploration Files (can be archived)
    ├── explore-asana.js
    ├── debug-asana.js
    └── explore-workspace.js
```

---

## 🔐 Security & API Key Management

### CRITICAL: Production Security Checklist

**✅ Completed (Production-Ready)**
1. **Environment Variable Validation** - All API clients validate keys on initialization
2. **No Hardcoded Keys** - All keys loaded from `.env` via `process.env`
3. **Git Protection** - `.gitignore` excludes `.env` and sensitive files
4. **Template Available** - `.env.example` provides safe setup template
5. **Documentation Clean** - `PROJECT_STATUS.md` contains NO actual keys

### How API Keys Are Protected

**Code-Level Protection:**
```javascript
// ✅ CORRECT - All our clients do this
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey || apiKey.startsWith('your-')) {
  throw new Error('Invalid API key');
}

// ❌ NEVER do this
const apiKey = 'sk-proj-abc123...';  // NEVER hardcode!
```

**File Protection:**
- `.env` - Contains actual keys (NEVER commit)
- `.env.example` - Template with placeholders (safe to commit)
- `.gitignore` - Protects `.env` from git
- `PROJECT_STATUS.md` - Documentation only (no actual keys)

### Setup Instructions

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Add your actual API keys to `.env`:**
   ```env
   ASANA_API_TOKEN=<paste-your-asana-token>
   OPENAI_API_KEY=<paste-your-openai-key>
   ```

3. **NEVER commit `.env` file**
   ```bash
   # Check what will be committed
   git status

   # .env should NOT appear in the list
   # If it does, it's protected by .gitignore
   ```

### Before Every Git Push

**Run this checklist:**
```bash
# 1. Search for any hardcoded API keys
grep -r "sk-proj" --exclude-dir=node_modules --exclude=".env" .
grep -r "2/269621475" --exclude-dir=node_modules --exclude=".env" .

# 2. Verify .env is in .gitignore
cat .gitignore | grep "\.env"

# 3. Check what you're about to commit
git status
git diff

# 4. If all clear, commit safely
git add .
git commit -m "Your commit message"
git push
```

### Production Deployment

**Environment Variables in Production:**
- Use your hosting provider's environment variable system
- Examples:
  - **Heroku**: `heroku config:set OPENAI_API_KEY=sk-...`
  - **Vercel**: Add in dashboard under Settings → Environment Variables
  - **AWS/Azure**: Use Secrets Manager or Key Vault
  - **Docker**: Pass via `-e` flag or `docker-compose.yml`

**NEVER:**
- Hardcode keys in source code
- Commit `.env` files to git
- Share keys in Slack/email
- Log full API keys (our code logs "...last 8 chars" only for debug)
- Store keys in documentation files

### Key Rotation Best Practices

When rotating API keys:
1. Generate new key in provider dashboard
2. Update `.env` file locally
3. Update production environment variables
4. Test that new key works
5. Revoke old key in provider dashboard

---

## 💡 Key Decisions Already Made

✅ **Slack Bot** over forms/workflows
- More conversational, ChatGPT-like experience
- Better for real-time interaction

✅ **Asana Data as Source of Truth**
- No duplicating data, always current
- Leverages your existing structure

✅ **GPT-4o-mini for Intelligence**
- Fast & affordable (~$3-5/month)
- Perfect for coaching context

✅ **Construction Industry Focus**
- Bot will understand typical construction workflows
- Recommendations based on industry best practices

✅ **Streaming Responses**
- Feels responsive like ChatGPT
- Better coaching experience

---

## ⚙️ Development Phases

### Phase 1: Foundation (Week 1-2)
- Slack bot setup & message handling
- Asana client data retrieval
- Basic status responses
- Test with 1-2 coaches

### Phase 2: Intelligence (Week 3)
- Performance analysis engine
- OpenAI recommendation generation
- Construction context integration
- Conversation memory

### Phase 3: Polish (Week 4)
- Error handling & resilience
- Caching for performance
- Rate limiting
- Documentation & deployment

---

## 🤔 Next Actions

1. **Review** `IMPLEMENTATION_PLAN.md` (detailed 30-minute read)
2. **Confirm** the 5 key questions:
   - Slack workspace ready?
   - Client project naming convention?
   - Most important custom fields?
   - Industry context level?
   - Conversation summary location?
3. **Set up** Slack App credentials when ready
4. **Create** first bot message handler
5. **Test** with live Asana data

---

## 📚 Resources

### Asana API Docs
- https://developers.asana.com/docs/getting-started-with-the-api

### Slack Bolt Docs
- https://slack.dev/bolt-js/

### OpenAI API Docs
- https://platform.openai.com/docs/guides/gpt

### Construction Industry Context
- We'll build a knowledge base of best practices for UK/AUS construction companies ($1M-$5M)

---

## 🎓 Questions to Clarify

Before we start building Phase 1, please provide:

1. **Slack Workspace**: Do you have admin access to the Slack workspace where your coaches are? Is there a specific channel for the bot, or should it be available workspace-wide?

2. **Client Identification**: How are client projects named in Asana?
   - Direct match (e.g., "Brad Goodridge" project = Brad's client)?
   - Any other naming pattern?

3. **Custom Fields Priority**: Of the 20 fields in your workspace, which 5-7 are MOST important for coaching?
   - Should we focus on Priority, Progress, Effort, Lead Status, etc.?

4. **Industry Context**: What level of detail?
   - Basic (general construction knowledge)
   - Detailed (specific UK/AUS regulations, labor costs, etc.)
   - Custom (your specific coaching methodology)

5. **Conversation Summaries**: Where are these stored?
   - In task descriptions?
   - In comments/notes?
   - Custom field?
   - Separate Asana section?

---

## 📞 Support

If you have questions:
- Check `IMPLEMENTATION_PLAN.md` (most questions answered there)
- Review the Asana API debug output in this folder
- Ask clarifying questions about implementation details

---

**Ready to build something great for your coaching team! Let's make it happen.** 🚀
