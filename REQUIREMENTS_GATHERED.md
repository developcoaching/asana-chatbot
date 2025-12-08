# Conversational Requirements Gathering - Complete Responses

**Date**: December 5, 2025
**Purpose**: Full MVP requirements based on Coach feedback

---

## ✅ Initial 5 Questions + All Answers

### Question 1: Project Naming Convention
**Question**: How are your client projects named in Asana?
**Your Answer**: **Exact client names**
- Projects are named exactly as client names (e.g., "Brad Goodridge")
- Makes matching simple: "Brad" → "Brad Goodridge"
- ✅ Our fuzzy matching algorithm will work perfectly

### Question 2: Priority Information
**Question**: What information matters MOST when coaches ask about a client?
**Your Answer**: **The full picture**
- Want: Task progress % + Next items to do + Bottlenecks
- Not prioritizing one over others
- Need complete context for coaching decisions
- ✅ Bot will show all three equally

### Question 3: Data Freshness
**Question**: How often do coaches update Asana?
**Your Answer**: **Daily**
- Tasks updated every day or multiple times per day
- Data is current and reliable
- Can safely provide real-time status
- ✅ No stale data issues

### Question 4: Usage Pattern
**Question**: Will coaches ask from Slack channels or DMs or both?
**Your Answer**: **Both should work**
- Coaches need to use both channel mentions AND private DMs
- Support both patterns equally
- ✅ Slack bot must handle app_mentions and direct messages

### Question 5: Next Actions After Status Display
**Question**: What should coaches be able to do after bot shows status?
**Your Answer**: **All of above**
- Just read info in Slack ✓
- Update Asana from Slack ✓
- Get recommendations ✓
- Need full feature set
- ✅ MVP will include all three capabilities

---

## 📊 Follow-Up Questions + All Answers

### Follow-Up 1: Response Ordering
**Question**: Since you want "full picture", which should show FIRST?
**Your Answer**: **All equally**
- Don't prioritize progress % OR next items OR bottlenecks
- Show summary level of all three components
- Coaches want to see everything at once
- ✅ Response format: Combined view showing all three

**Response Template Should Be**:
```
📊 Brad Goodridge
━━━━━━━━━━━━━━━━━━━━━
✅ Progress: 65% Complete (13/20 tasks)
⚠️  Bottlenecks: 1 overdue, approval blocked
➡️  Next Items:
  1. Site inspection approval
  2. Client sign-off on phase 2
```

### Follow-Up 2: Daily Change Tracking
**Question**: Should the bot highlight changes from yesterday?
**Your Answer**: **Yes, show daily changes**
- "Brad's project went from 60% → 65% today"
- Coaches care about momentum and progress
- Give context on what changed
- ✅ Include delta/change indicators in responses

**Response Enhancement**:
```
✅ Progress: 65% Complete (13/20) ↑ +5% since yesterday
```

### Follow-Up 3: Channel Usage Preference
**Question**: For both channels AND DMs, what's the primary usage?
**Your Answer**: **Equal mix**
- Coaches use channels sometimes, DMs other times
- No preference which is primary
- Both patterns equally important
- ✅ Support both equally, no optimization needed

### Follow-Up 4: Recommendation Type
**Question**: What kind of recommendations do coaches need?
**Your Answer**: **Data-driven insights**
- "You're 10% behind schedule, here's why"
- NOT: Industry best practices (yet)
- NOT: Generic coaching advice
- FOCUS: What the data tells you about this client
- ✅ Phase 2 feature: Data-driven recommendations powered by AI

**Example**: "Brad's approval process is taking 4 days (vs 2-day industry average). This blocked 3 tasks this week. Impact: 1 week delay on timeline."

### Follow-Up 5: Asana Updates from Slack
**Question**: Which Asana update actions matter most?
**Your Answer**: **Just needs links**
- Don't need to mark tasks done from Slack
- Don't need to add notes from Slack
- Don't need to change status/priority from Slack
- Just need clickable Asana links to the project/tasks
- ✅ MVP: Provide links, coaches click to Asana to edit

**Link Format**:
```
Open in Asana: https://app.asana.com/0/PROJECT_ID/list
```

---

## 🎯 Complete MVP Requirements Summary

### What Coaches Will Do
```
Coach (in Slack):
"@bot What's the status on Brad?"

Bot responds with:
✅ Current progress (% complete)
✅ What changed today (+5% vs yesterday)
✅ Next 3-5 items to do
✅ Bottlenecks/blockers (e.g., 1 overdue)
✅ Link to open project in Asana

Coach (follow-up in thread):
"Tell me more about that overdue task"

Bot responds with:
✅ Task details
✅ Why it matters
✅ Link to task in Asana
```

### Platform Requirements
| Requirement | Your Answer | MVP Status |
|-------------|-------------|-----------|
| Project naming | Exact client names | ✅ Simple exact match |
| Information shown | Full picture (3 components) | ✅ All three shown equally |
| Data freshness | Daily updates | ✅ Real-time safe |
| Input method | Channels + DMs both | ✅ Support both |
| Output actions | Read + recommendations + links | ✅ Links MVP, recommendations Phase 2 |
| Change tracking | Show daily deltas | ✅ Track +/-% daily |
| Asana editing | Provide links only | ✅ Just links (Phase 2: direct edits) |

---

## 🚀 How This Shapes Our MVP

### Phase 1 MVP (Now): Status Queries
✅ Works in channels AND DMs
✅ Shows full picture (progress + next + bottlenecks)
✅ Includes daily change indicators
✅ Provides Asana project links
✅ Supports follow-up questions in threads

### Phase 2 (Later): Recommendations
✅ Data-driven insights ("You're 10% behind because...")
✅ Option to update Asana directly from Slack
✅ AI-powered analysis

### Phase 3 (Later): Advanced
✅ Bulk insights ("Standup on all clients")
✅ Alerts when thresholds crossed
✅ Trend analysis over weeks/months

---

## 💬 Conversation Flow Example

```
Coach: @bot What's the status on Brad Goodridge?

Bot:
📊 Brad Goodridge
━━━━━━━━━━━━━━━━━━━━━━
✅ Progress: 65% (13/20 tasks) ↑ +5% today
⏰ Next Items:
  1. Site inspection approval - Due Dec 8
  2. Electrical work quote review - Due Dec 12
  3. Client sign-off on phase 2 - Due Dec 15

⚠️  Bottlenecks:
  • 1 task overdue (Site inspection)
  • Approval process blocking 2 tasks

📎 Open Project: [Link to Asana]

---

Coach: What's blocking the inspection?

Bot:
The site inspection task is stuck waiting for client approval.
Status: "Awaiting Client Review" since Dec 4 (4 days)

Next Step: Follow up with client on approval

📎 Open Task: [Link to inspection task in Asana]

---

Coach: Has anything else been delayed?

Bot:
Looking at Brad's project history...
• 3 tasks were delayed this week (vs 0 last week)
• All 3 are related to client approvals
• Pattern: Approval process is creating bottlenecks

📈 Recommendation (Phase 2):
Set daily approval windows (10am & 3pm)
Could reduce approval time from 4 days → 1 day

Ready to dive deeper? Ask me anything about Brad's project.
```

---

## ✨ Key Insights From Your Answers

### What Makes This Work
1. **Daily updates** = Bot can safely provide real-time status
2. **Exact client names** = Simple matching, no ambiguity
3. **Both channels + DMs** = Flexible coaching workflows
4. **Full picture needed** = Shows complete context, not just progress %
5. **Links not edits** = Coaches already trust Asana, just need convenience of Slack

### Build Priority
1. **ESSENTIAL (MVP now)**:
   - Status queries ✓
   - Full picture display ✓
   - Daily change tracking ✓
   - Asana links ✓

2. **HIGH (Phase 2 soon)**:
   - Data-driven recommendations
   - Conversation memory
   - Follow-up questions

3. **NICE (Phase 3 later)**:
   - Direct Asana editing from Slack
   - Bulk insights
   - Alert system

---

## 🎓 Summary for Development

**MVP now focuses on**:
- Exact name matching (no fuzzy needed, but keep it as fallback)
- Full dashboard view (not stripped down)
- Daily delta calculation
- Link generation to Asana
- Thread-based follow-up conversations
- Support for both channels AND DMs

**Not in MVP**:
- AI recommendations (Phase 2)
- Asana direct edits (Phase 2)
- Alerts/automations (Phase 3)

This is conversational, simple, and focused on what coaches actually need: **Fast access to complete client status + ability to drill down for details**.

---

## 📝 Ready for Coding

With these requirements locked in, we can now:
1. Update response formatter to show "full picture" equally
2. Add daily change calculations
3. Generate Asana links in responses
4. Support thread conversations
5. Test with both channels and DMs

**All answers captured. Ready to build to spec!** 🚀
