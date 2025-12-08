# Context - Asana Workspace Reference

**Workspace**: Develop Coaching
**Workspace ID**: 237098990512572
**Total Projects**: 184
**Custom Fields**: 20
**Last Scanned**: December 5, 2025

---

## 📋 Workspace Overview

### User Information
- **Email**: greg@developcoaching.co.uk
- **Name**: Greg Wilkes
- **Workspaces**: 2 (Personal Projects + Develop Coaching)
- **Role**: Admin (full API access)

### Workspace Structure
```
Develop Coaching Workspace
├── Client Projects (50-60)
│   ├── Brad Goodridge
│   ├── The studios white city
│   ├── [50+ more clients]
│   └── ...
├── Template Projects (4+)
│   ├── TEMPLATE Processes
│   ├── TEMPLATE In-Project
│   ├── TEMPLATE Projects
│   └── TEMPLATE Pre-Project
└── Utility Projects
    ├── Project Template
    ├── Completed Assigned Tasks
    ├── Visual Branding
    └── [10+ more]
```

---

## 🗂️ Custom Fields Reference

### All 20 Custom Fields with Details

#### 1. **Drawings Required?**
- **ID**: 442190314479435
- **Type**: Enum (dropdown)
- **Purpose**: Track if drawings/blueprints are needed
- **Options**:
  - Yes - Action
  - No - already have
  - No - not needed
- **Use Case**: Construction documentation tracking

#### 2. **Added By**
- **ID**: 1003559224595961
- **Type**: Enum
- **Purpose**: Attribution - who added this task
- **Options**:
  - Greg
  - Daniel
  - Angie
- **Use Case**: Team workload attribution

#### 3. **To Be Completed By Date**
- **ID**: 1003559224595967
- **Type**: Text
- **Purpose**: Custom deadline field (allows flexible date entry)
- **Format**: Text-based date string
- **Use Case**: Deadline tracking when specific dates matter

#### 4. **Priority**
- **ID**: 1103796154808011
- **Type**: Enum
- **Purpose**: Task importance level
- **Options**:
  - High
  - Medium
  - Low
- **Use Case**: Resource allocation & urgency
- **Importance**: ⭐⭐⭐ HIGH - Core coaching metric

#### 5. **Added by** (alternate)
- **ID**: 1103796154808016
- **Type**: Enum
- **Purpose**: Role-based attribution
- **Options**:
  - Manager
  - Report
- **Use Case**: Distinguish task origin (management vs team member)

#### 6. **Minutes**
- **ID**: 1103796154808020
- **Type**: Number
- **Purpose**: Time tracking - minutes spent on task
- **Range**: Numeric value
- **Use Case**: Effort quantification & burndown analysis
- **Importance**: ⭐⭐ MEDIUM - Effort analysis

#### 7. **Priority level?**
- **ID**: 1202247855079852
- **Type**: Enum
- **Purpose**: Alternate priority field (more granular)
- **Options**:
  - High priority
  - Medium priority
  - Low priority
- **Use Case**: May be newer version of Priority field
- **Note**: Discuss consolidation with Greg

#### 8. **Sentiment**
- **ID**: 1202247855079857
- **Type**: Enum
- **Purpose**: Track emotional tone of feedback/updates
- **Options**:
  - Positive
  - Neutral
  - Negative
- **Use Case**: Client satisfaction tracking, risk flagging
- **Importance**: ⭐⭐ MEDIUM - Client health indicator

#### 9. **Feedback type**
- **ID**: 1202247855079862
- **Type**: Enum
- **Purpose**: Classify type of feedback/issue
- **Options**:
  - Question
  - Comment
  - Feature request
  - Bug
- **Use Case**: Categorize client feedback for team triage
- **Importance**: ⭐ LOW - Classification only

#### 10. **Actionable**
- **ID**: 1202247855079868
- **Type**: Enum
- **Purpose**: Whether feedback requires action
- **Options**:
  - Yes
  - No
- **Use Case**: Filter tasks needing response vs informational
- **Importance**: ⭐ LOW - Binary filter

#### 11. **Estimated value**
- **ID**: 1203127624300361
- **Type**: Number
- **Purpose**: Estimated monetary value of task/item
- **Format**: Currency amount (no symbol)
- **Use Case**: ROI calculation, priority based on value
- **Importance**: ⭐⭐⭐ HIGH - Business value tracking

#### 12. **Lead status**
- **ID**: 1203127624902183
- **Type**: Enum
- **Purpose**: Sales funnel stage (5-stage pipeline)
- **Options**:
  - Contacted
  - Qualification
  - Meeting
  - Proposal
  - Closed
- **Use Case**: Sales pipeline management & forecasting
- **Importance**: ⭐⭐⭐ HIGH - Sales tracking

#### 13. **Account name**
- **ID**: 1203127626015121
- **Type**: Text
- **Purpose**: Client/account identifier
- **Format**: Text string
- **Use Case**: Cross-reference with Asana project name
- **Importance**: ⭐⭐ MEDIUM - Client matching

#### 14. **Next Steps (Sales)**
- **ID**: 1203127626015123
- **Type**: Enum
- **Purpose**: Recommended next action in sales process
- **Options**:
  - Follow up email
  - Follow up call
  - Schedule sales call
  - Follow up on sales call
  - Prepare live demo
  - Finalize proposal
  - Send contract
  - Follow up on closed deal
  - No action needed
- **Use Case**: Actionable guidance for sales team
- **Importance**: ⭐⭐⭐ HIGH - Action driver

#### 15. **Effort level?**
- **ID**: 1204558237891577
- **Type**: Enum
- **Purpose**: Estimate of work complexity/effort
- **Options**:
  - Low effort
  - Medium effort
  - High effort
  - Need to scope
- **Use Case**: Resource planning & capacity assessment
- **Importance**: ⭐⭐⭐ HIGH - Planning & coaching metric

#### 16. **Type (Work Requests - IT)**
- **ID**: 1204558237891583
- **Type**: Enum
- **Purpose**: Classify IT/support work request type
- **Options**:
  - Access request
  - Troubleshooting
  - New hardware
  - New software
  - Password reset
  - Other
- **Use Case**: IT helpdesk ticket classification
- **Importance**: ⭐ LOW - IT-only tasks

#### 17. **Task Progress**
- **ID**: (Not listed - need to fetch)
- **Type**: Likely Enum or Percentage
- **Purpose**: Track task completion % or status
- **Use Case**: Real-time progress visibility
- **Importance**: ⭐⭐⭐ HIGH - Core metric

#### 18-20. **(Additional fields)**
- Not fully documented in scan - may be text fields or custom types
- **Action**: Run detailed field scan to get full info

---

## 🎯 Custom Fields by Coaching Purpose

### For Performance Analysis
| Field | Why Important | How to Use |
|-------|--------------|-----------|
| **Effort level?** | Understand workload distribution | Compare % high vs low effort tasks |
| **Priority** | Identify critical path | High-priority tasks should complete first |
| **Minutes** | Track actual time vs estimate | Identify tasks taking longer than expected |
| **Task Progress** | Understand % complete | Drive overall project completion % |
| **Estimated value** | See ROI impact | Prioritize high-value work |

### For Risk Detection
| Field | Warning Signs | Action |
|-------|--------------|--------|
| **Lead status** | Stuck in "Qualification" for >2 weeks | Coach on sales process |
| **Sentiment** | "Negative" feedback increasing | Intervention needed |
| **Next Steps (Sales)** | "No action needed" on old tasks | Review for closure |
| **Actionable** | "Yes" count growing | Backlog building up |

### For Recommendations
| Field | Insight Opportunity | Recommendation |
|-------|-------------------|-----------------|
| **Effort level?** | 70%+ high-effort tasks | "Spread effort more evenly - you'll burn out" |
| **Minutes** | Increasing trend | "Tasks taking longer - do you need support?" |
| **Priority** | Mixed High/Low/Medium | "Consolidate into clearer categories" |
| **Lead status** | Long cycles | "Your approval process is [X] days - can we speed up?" |

---

## 📊 Key Projects Reference

### Sample Client Projects
```
Project: Brad Goodridge (ID: 1199409624394854)
- Status: Active
- Tasks: Multiple (not counted in scan)
- Use: Example client for testing

Project: The studios white city (ID: 1201318142178015)
- Status: Active
- Tasks: Multiple
- Use: Example client for testing

Project: TEMPLATE Processes (ID: 1201894832285089)
- Status: Active
- Type: Template
- Use: Understanding process tracking

Project: TEMPLATE In-Project (ID: 1201894832285118)
- Status: Active
- Type: Template
- Use: Understanding in-flight project tracking
```

### Template Projects (4 identified)
1. **TEMPLATE Processes** - Standard process tracking template
2. **TEMPLATE In-Project** - Tracking during project execution
3. **TEMPLATE Projects** - Overall project management
4. **TEMPLATE Pre-Project** - Pre-launch planning

---

## 🔄 Data Relationships

### How Client Data Flows

```
1. Client Query from Coach
   ↓
2. Bot matches to Asana Project
   (Project name = Client name)
   ↓
3. Fetch Project Data
   - All tasks in project
   - All custom field values
   - Task status & dates
   ↓
4. Analyze Against Custom Fields
   - Calculate effort distribution
   - Assess priority mix
   - Check lead status pipeline
   - Review value per task
   ↓
5. Generate Coaching Insights
   - Use industry context
   - Compare to benchmarks
   - Highlight risks
   ↓
6. Present to Coach in Slack
```

### Cross-Project Queries

**To Enable "Compare Brad to team average"**:
1. Fetch all active client projects
2. Calculate metrics for each
3. Compute team average
4. Show Brad's vs average comparison

---

## 🏗️ Construction Industry Context

### Typical Project Phases (UK/AUS)
1. **Pre-Project**: Planning, approval, design
2. **Mobilization**: Resources, setup
3. **Execution**: Main work
4. **Quality Assurance**: Testing, inspection
5. **Closure**: Handover, payment, feedback

### Common Bottlenecks
- ❌ Approval delays (2-3 days typical, can cause cascades)
- ❌ Weather delays (seasonal, unpredictable)
- ❌ Material shortages (supply chain)
- ❌ Regulatory inspections (timing dependent)
- ❌ Client decision delays

### Benchmarks (UK/AUS, $1M-$5M firms)
- **On-time delivery**: 85-92% (higher is better)
- **Schedule variance**: ±10% typical (more means issues)
- **Cost variance**: ±8% typical
- **Approval turnaround**: 1-2 days ideal, >3 days is problem
- **Team utilization**: 70-80% is healthy
- **Quality defects**: <3% typical

### Coaching Points
- ✅ Approval process optimization
- ✅ Resource leveling (avoid peaks/valleys)
- ✅ Risk management (early identification)
- ✅ Team communication (reduce surprises)
- ✅ Client satisfaction (feedback loops)

---

## 🔐 API Authentication

### Token Information
- **Token Stored**: `.env` file as `ASANA_API_TOKEN`
- **Workspace ID**: 237098990512572
- **Access Level**: Admin (full read + write capabilities)
- **Rate Limits**: 100 req/min (Asana standard)
- **Never**: Hardcode, log, or share token

### API Endpoints Used
```
Core Endpoints:
GET /workspaces/{workspace_id}/projects
GET /projects/{project_id}/tasks
GET /tasks/{task_id}
GET /workspaces/{workspace_id}/custom_fields

Data Fields Fetched (opt_fields parameter):
- name
- gid (Asana ID)
- completed
- due_on
- assignee
- custom_fields
- projects
- notes
```

---

## 📝 Data Quality Notes

### What We Know Works
✅ Project names are consistent (can use for client matching)
✅ Custom fields are populated on tasks
✅ Task status tracking is current
✅ API responses are fast (<1 sec)

### Assumptions We're Making
⚠️ Project name = Client name (verify with Greg)
⚠️ Custom fields are filled consistently (may need validation)
⚠️ Conversation summaries exist somewhere (location TBD)
⚠️ Task dates are accurate (no backdating)

### Data Gaps to Address
❓ Conversation summaries - where stored?
❓ Client metadata beyond task data
❓ Historical tracking (is there past data?)
❓ Team member skill/capacity info

---

## 🎨 Field Usage Recommendations for Bot

### High Priority (Use in All Responses)
1. **Task Progress / Status** - Shows % complete
2. **Priority** - Explains what matters most
3. **Effort level?** - Helps with capacity planning
4. **Lead status** - Shows sales pipeline health

### Medium Priority (Use for Insights)
1. **Estimated value** - ROI context
2. **Minutes** - Time investment tracking
3. **Sentiment** - Client satisfaction signal
4. **Next Steps (Sales)** - Actionable guidance

### Low Priority (Reference When Needed)
1. **Feedback type** - Classify feedback
2. **Actionable** - Filter questions
3. **Drawings Required?** - Domain-specific
4. **Type (Work Requests - IT)** - IT-only

---

## 🚀 Implementation Checklist

### Discovery Phase (Complete ✅)
- ✅ Scanned workspace
- ✅ Found 184 projects
- ✅ Identified 20 custom fields
- ✅ Verified API access
- ✅ Documented structure

### Planning Phase (In Progress)
- ⏳ Answer Greg's 5 clarification questions
- ⏳ Define field priorities
- ⏳ Create field reference guide
- ⏳ Set up Slack credentials

### Development Phase (Ready to Start)
- ⏳ Build Asana client wrapper
- ⏳ Create field mapping
- ⏳ Implement data fetching
- ⏳ Build analysis logic

---

## 📞 Questions to Ask Greg

1. **Client Identification**: How should bot match coach query to project?
   - Is "Brad" == "Brad Goodridge" project?
   - Any aliases or nicknames?

2. **Conversation Summaries**: Where are coaching notes stored?
   - In task descriptions?
   - In project notes?
   - Custom field?
   - External document?

3. **Custom Field Consolidation**:
   - Use both "Priority" AND "Priority level?" or just one?
   - Same with "Added By" vs "Added by"?

4. **Data Recency**:
   - How often are custom fields updated?
   - Any stale projects we should skip?

5. **Coaching Focus**:
   - Which 5-7 custom fields matter most for your coaching?
   - Any fields we shouldn't show coaches?

---

## 🔗 Related Documentation

- **README.md** - Quick start
- **IMPLEMENTATION_PLAN.md** - Full architecture
- **task_list.md** - Development tasks
- **summary.md** - Executive summary
- `explore-workspace.js` - Script that generated this context
- `.env` - Token (never commit)

---

## ✨ Ready for Development

This context document provides all the information needed to:
1. Build Asana data fetcher
2. Create field mapping logic
3. Implement coaching recommendations
4. Generate bot responses

**Next Step**: Build the bot! 🚀
