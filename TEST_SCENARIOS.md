# Real Coaching Conversation Tests

**Purpose**: Test actual coaching queries the bot will receive
**Based on**: Your requirements (daily updates, full picture, data-driven insights)

---

## 🎯 SCENARIO 1: Quick Status Check

### Coach Query
```
@bot Give me a status update on Brad Goodridge
```

### Expected Bot Response
```
📊 Brad Goodridge - Status Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Progress: 65% Complete (13/20 tasks)
↑ +5% since yesterday (60% → 65%)

📈 This Week's Work:
• Started: 4 new tasks
• Completed: 3 tasks
• Velocity: On track

➡️ Next Priority Items (Due Soon):
1. Site inspection approval - Due Dec 8 (3 days left)
2. Electrical work quote review - Due Dec 12 (7 days left)
3. Client sign-off on phase 2 - Due Dec 15 (10 days left)

⚠️ Bottlenecks:
• 1 task OVERDUE (Site inspection - 4 days late)
• Approval process blocking 2 dependent tasks
• No critical blockers otherwise

📎 Open in Asana: https://app.asana.com/0/PROJECT_ID/list
```

---

## 🎯 SCENARIO 2: Last Week's Activity

### Coach Query
```
@bot What did Brad work on last week? What was completed?
```

### Expected Bot Response
```
📋 Brad Goodridge - Last Week (Nov 28 - Dec 4)

✅ Tasks Completed (3 total):
1. ✓ Preliminary site survey - Completed Nov 30
2. ✓ Materials quote submitted - Completed Dec 1
3. ✓ Schedule coordination - Completed Dec 3

📝 Tasks Assigned (6 total):
1. Site inspection approval - Assigned Nov 28 - OVERDUE
2. Electrical work quote review - Assigned Nov 29 - In Progress
3. Client cost approval - Assigned Nov 30 - Pending
4. Supply order submission - Assigned Dec 1 - Not Started
5. Team briefing schedule - Assigned Dec 2 - In Progress
6. Budget review - Assigned Dec 3 - In Progress

📊 Last Week Summary:
• Completion Rate: 50% (3 of 6 assigned)
• Average completion time: 2.1 days
• Tasks delayed: 1
• Bottleneck: Approvals (4-day average wait)

📈 Trend: Slightly slower than previous week (was 60% completion)

Next: Need to address approval delays

📎 View Detailed Timeline: https://app.asana.com/...
```

---

## 🎯 SCENARIO 3: Deep Dive on Assignments

### Coach Query
```
@bot Who's assigned what on Brad's project? Who's falling behind?
```

### Expected Bot Response
```
👥 Brad Goodridge - Task Assignments

Team Members & Current Load:

💼 Brad (Primary)
  • 7 tasks assigned
  • 5 in progress, 2 not started
  • Completion rate: 65%
  • Avg task time: 2.1 days
  Status: On track ✓

🔧 Daniel (Subcontractor)
  • 4 tasks assigned
  • 2 completed, 2 in progress
  • Completion rate: 50%
  • Avg task time: 3.2 days
  Status: ⚠️ Slightly behind (approvals slow)

👷 Angie (Support)
  • 3 tasks assigned
  • 1 completed, 2 in progress
  • Completion rate: 33%
  • Avg task time: 2.8 days
  Status: New tasks, on track

🚨 Falling Behind:
  • Daniel: Waiting on client approvals (4+ days)
  • Angie: Supply order stuck (need purchase order)

⚡ Quick Wins Available:
  • Site inspection: Just needs 1 approval (can close today)
  • Budget review: 95% done, waiting on review

📊 Overall: Team on track, but approvals are bottleneck

📎 View Assignments: https://app.asana.com/...
```

---

## 🎯 SCENARIO 4: This Week's Forecast

### Coach Query
```
@bot What's Brad's forecast for this week? What's due?
```

### Expected Bot Response
```
📅 Brad Goodridge - This Week's Forecast (Dec 5-11)

⏰ Due This Week (5 items):
• Dec 8:  Site inspection approval (OVERDUE - 4 days)
• Dec 8:  Electrical quote review (Due in 3 days)
• Dec 9:  Client cost approval (Due in 4 days)
• Dec 10: Supply order submission (Due in 5 days)
• Dec 11: Team briefing schedule (Due in 6 days)

📊 Projected Completion:
If current velocity continues:
  • Expected: 4/5 items completed (80%)
  • Risk: Site inspection still needs approval
  • If approval doesn't come: 3/5 (60%)

⚠️ Critical Path:
  Site inspection → Approval → Next phase
  (Currently 4 days delayed)

🎯 Recommendation:
  Follow up on site inspection TODAY
  Could clear 2 dependent tasks if approved

📈 Trend:
  This week tracking similar to last week
  Unless approvals speed up, will slip to 70% completion

📎 View Timeline: https://app.asana.com/...
```

---

## 🎯 SCENARIO 5: Performance Comparison

### Coach Query
```
@bot How's Brad doing compared to other clients? Average project?
```

### Expected Bot Response
```
📊 Brad Goodridge - Performance Comparison

vs Your Team Average (50-60 clients):

Metric                  Brad      Team Avg    Status
──────────────────────────────────────────────────
Completion %            65%       62%         ✓ Above avg
Weekly Velocity         3/6 tasks 3/5 tasks   ≈ Same
On-Time Delivery        92%       85%         ✓ Better
Approval Wait Time      4 days    2.5 days    ⚠️ Slower
Task Duration           2.1 days  2.3 days    ✓ Faster
Overdue Count           1         0.8 avg     ⚠️ Slightly more

💚 Brad's Strengths:
  • Consistently completes tasks
  • Fast execution (2.1 day avg)
  • High on-time rate (92%)

⚠️ Brad's Gaps:
  • Approval bottleneck (4 days vs 2.5 day average)
  • Slightly more overdue tasks this week

🎯 Comparison:
  Brad is ABOVE AVERAGE overall
  Main issue: Approval process (likely client-side)

Recommendation:
  Good performer. Help with approval speedup.
  If you solve approval delays → could hit 95% on-time

📎 View Team Dashboard: https://app.asana.com/...
```

---

## 🎯 SCENARIO 6: Conversational Follow-up

### Coach Query (In Thread)
```
Tell me more about that approval bottleneck. What's the actual blocker?
```

### Expected Bot Response
```
🔍 Digging into the approval bottleneck...

Site Inspection Task Details:
────────────────────────────────
Task: "Site inspection approval"
Status: OVERDUE (4 days, due Dec 8)
Assigned To: Daniel

Timeline:
  • Nov 28: Assigned to Daniel
  • Nov 30: Daniel completed inspection
  • Nov 30: Waiting on client approval (submitted)
  • Dec 4: Still waiting... (4 days!)

Blocker: CLIENT APPROVAL
  • Not our process, client's approval queue
  • Client has not reviewed/approved
  • No follow-up sent since Dec 1

Impact:
  ✗ Holds 2 dependent tasks
  ✗ Delays next phase by ~1 week
  ✗ Already 4 days behind schedule

Previous Pattern:
  • Brad's approval avg: 4.2 days
  • Team average: 2.5 days
  • This is consistent pattern (not one-off)

Root Cause Analysis:
  → Client approval process is slow
  → Possibly: Client busy, not prioritized, or bottlenecked on their end

💡 Action Items:
  1. Brad: Follow up with client TODAY
  2. Establish 48-hour approval SLA with client
  3. Send reminders instead of waiting

Expected Impact if Fixed:
  • Could get approval by Dec 6
  • Frees up 2 tasks
  • Gets back to schedule

📎 Contact Client: [Link]
📎 View Task Details: https://app.asana.com/...
```

---

## 🎯 SCENARIO 7: Morning Standup

### Coach Query
```
@bot Give me a 2-minute standup on all my active clients
```

### Expected Bot Response (Would be Phase 2, but shows format)
```
⚡ Quick Standup - All Active Clients (10 clients shown)

🟢 ON TRACK (6 clients):
✓ Brad Goodridge       65% → 70% ⬆️  No issues
✓ John Smith           78% → 80% ⬆️  On schedule
✓ The Studios White    55% → 58% ⬆️  Normal progress
✓ Sarah Johnson        81% → 82% ⬆️  Almost done
✓ Mike Davis           42% → 45% ⬆️  Ramping up
✓ Lisa Chen            90% → 91% ⬆️  Final phase

🟡 ATTENTION NEEDED (3 clients):
⚠️  James Wilson        60% (FLAT)     No progress this week
⚠️  Emma Rodriguez      48% → 40% ⬇️   Dropped 8% - Issue?
⚠️  Tom Blake           35% (DELAYED)  Task overdue 2 days

🔴 CRITICAL (1 client):
🚨 Alex Morgan         72% → 60% ⬇️   Major slip - approval blocked

Summary:
  • 6 on track, 3 need attention, 1 critical
  • Avg completion: 62% (up 2% from last week)
  • 4 clients have overdue items
  • 1 client has approvals stuck

Quick Actions Needed:
  1. Talk to James (no progress)
  2. Check with Emma (dropped 8%)
  3. Follow up on Alex (major slip)

📊 Full Report: https://app.asana.com/...
```

---

## 🎯 SCENARIO 8: Follow-up Questions in Threads

### Initial Query
```
@bot Status on Brad?
```

### Bot Response (Initial)
```
📊 Brad Goodridge
[Full picture shown]
```

### Coach Follow-up
```
What changed since yesterday?
```

### Expected Bot Response (Context Aware)
```
Changes for Brad since yesterday (Dec 4 → Dec 5):

✅ Completed:
  • Budget review - Marked complete Dec 5 9:00am

📝 Assigned:
  • None new

🔄 Status Changes:
  • Electrical quote review: "In Review" → "Needs Approval"
  • Team briefing: No change

📊 Overall Progress:
  60% → 65% (+5%)

⏰ Still Waiting On:
  • Site inspection approval (4 days)

💡 Next:
  60% completion is good pace
  Keep pushing on approvals

📎 View Changes: https://app.asana.com/...
```

---

## 🎯 SCENARIO 9: Direct Message Usage

### Coach (Private DM)
```
quick status on Brad
```

### Expected Bot Response (Same as Channel)
```
📊 Brad Goodridge
[Full picture]

(Same response, works in DM too)
```

---

## 🎯 SCENARIO 10: Multiple Client Comparison

### Coach Query
```
@bot Compare Brad and John on the same metrics
```

### Expected Bot Response
```
⚖️ Comparing Brad Goodridge vs John Smith

Metric              Brad        John        Winner
─────────────────────────────────────────────────
Progress            65%         78%         John (13% more)
This Week +/-       +5%         +8%         John (faster)
On-Time Rate        92%         96%         John (4% better)
Overdue Tasks       1           0           John
Task Speed          2.1 days    1.9 days    John (faster)
Approval Delay      4 days      2 days      John (faster)

Brad's Position:
  • Strong performer
  • Main gap: Approval delays
  • Slightly behind John, but consistent

John's Position:
  • Top performer
  • Everything faster
  • 0 overdue (very disciplined)

How Brad Can Close Gap:
  1. Fix approval delays (4→2 days)
  2. Add weekly review (tighten oversight)
  3. Template for John's workflow

Both Clients:
  • Both healthy
  • Both on track
  • Brad just needs approval speedup

📎 Brad Details: https://app.asana.com/...
📎 John Details: https://app.asana.com/...
```

---

## ✅ Test Coverage

These 10 scenarios cover:

✓ Quick status queries
✓ Historical analysis (last week)
✓ Assignment tracking
✓ Forecasting
✓ Comparative analysis
✓ Deep dives with follow-ups
✓ Bulk insights (standup)
✓ Conversational memory (follow-ups)
✓ Private messaging
✓ Multi-client comparison

---

## 🚀 How to Use These Tests

1. **When bot is live**: Run these queries in Slack
2. **Verify responses**: Check against expected format
3. **Check data accuracy**: Confirm numbers match Asana
4. **Test conversation**: Do follow-ups work in threads?
5. **Test both channels + DMs**: Verify both work equally

---

## 📊 Success Criteria

Each test should:
- ✓ Return within 2 seconds
- ✓ Show full picture (progress + next + bottlenecks)
- ✓ Include daily change indicators
- ✓ Provide actionable insights
- ✓ Have clickable Asana links
- ✓ Support follow-ups in threads
- ✓ Work in channels AND DMs

---

## 🎯 Ready to Test

Once Slack credentials are provided:

```bash
npm install
npm start

# Then in Slack, try these queries and verify responses match expected format
```

All test scenarios are realistic coaching conversations based on your requirements!
