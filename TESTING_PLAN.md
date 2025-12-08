# Conversation Context - Testing & Validation Plan

## Success Criteria

### Primary Goal
Bot remembers which client is being discussed across multiple messages within the same session, enabling natural follow-up questions without re-stating the client name.

### Specific Success Metrics
1. ✅ First-name queries match correct client (e.g., "Jamie" → "Jamie Smith")
2. ✅ Follow-up questions work without client name ("What about his sales?")
3. ✅ Bot maintains context through 3+ consecutive messages
4. ✅ Different sessions maintain separate contexts
5. ✅ Context switches when new client is mentioned

---

## Test Cases (Real Construction Coaching Use Cases)

### Test 1: First-Name Matching
**Goal:** Verify improved name matching works

**Query:**
```
"How is Jamie doing?"
```

**Expected Result:**
- Matches client with "Jamie" in name (e.g., "Jamie Smith")
- Returns project status with task counts
- Response mentions full client name

**Validation:**
- [ ] Correct client matched
- [ ] No ambiguous match error
- [ ] Stats returned successfully

---

### Test 2: Basic Follow-up Context
**Goal:** Bot remembers client across 2 messages

**Session:** `test-session-001`

**Query 1:**
```
"Give me a status update on Brad Goodridge"
```

**Expected Result 1:**
- Matches "Brad Goodridge" project
- Returns: total tasks, completed, in progress, overdue
- Session stores currentClient = "Brad Goodridge"

**Query 2:** (immediately after)
```
"What tasks were completed this week?"
```

**Expected Result 2:**
- Bot knows we're still talking about Brad
- Returns Brad's completed tasks without asking "which client?"
- Conversation history passed to OpenAI

**Validation:**
- [ ] First query succeeds
- [ ] Second query uses stored context
- [ ] No "which client?" error on follow-up
- [ ] Both responses mention Brad

---

### Test 3: Extended Coaching Conversation
**Goal:** Maintain context through 3+ coaching-style questions

**Session:** `test-session-002`

**Query 1:**
```
"Tell me about Brad Goodridge's project"
```

**Expected:** Project overview

**Query 2:**
```
"What's blocking him?"
```

**Expected:** Overdue tasks or issues (still Brad context)

**Query 3:**
```
"Are there any tasks from last week that aren't done?"
```

**Expected:** Task status (still Brad context)

**Query 4:**
```
"How can we help him improve?"
```

**Expected:** Contextual advice based on Brad's project

**Validation:**
- [ ] All 4 queries maintain Brad context
- [ ] No re-asking for client name
- [ ] Responses are contextually relevant
- [ ] Conversation history grows with each message

---

### Test 4: Context Switch
**Goal:** Bot correctly switches to new client when mentioned

**Session:** `test-session-003`

**Query 1:**
```
"How is Brad Goodridge doing?"
```

**Expected:** Brad's project status

**Query 2:**
```
"What about Jamie?"
```

**Expected:**
- Bot switches context to Jamie
- Returns Jamie's project status
- currentClient updates to Jamie

**Query 3:**
```
"Show me his progress"
```

**Expected:** Jamie's progress (not Brad's)

**Validation:**
- [ ] Context switches correctly
- [ ] Third query refers to Jamie
- [ ] No mixing of Brad/Jamie data

---

### Test 5: Multiple Sessions (Isolation)
**Goal:** Different sessions don't interfere with each other

**Session A:** `test-session-004`
**Query:** "Tell me about Brad Goodridge"

**Session B:** `test-session-005`
**Query:** "Tell me about Jamie"

**Follow-up in Session A:**
**Query:** "What's his status?"

**Expected:** Returns Brad's status (not Jamie's)

**Validation:**
- [ ] Sessions maintain separate contexts
- [ ] No cross-contamination
- [ ] Each session tracks its own currentClient

---

## Technical Validation Checklist

### Frontend (`public/assets/js/script.js`)
- [ ] sessionId generated on page load (UUID format)
- [ ] sessionId stored in sessionStorage
- [ ] sessionId included in every `/api/chat` POST request
- [ ] Console log shows sessionId being sent

### Backend (`server.js`)
- [ ] Accepts `sessionId` from request body
- [ ] Creates session if doesn't exist: `sessions.set(sessionId, {...})`
- [ ] Stores `currentClient` in session
- [ ] Stores `conversationHistory` array in session
- [ ] Passes history to OpenAI intent extractor
- [ ] Uses `currentClient` when message doesn't specify client

### OpenAI Intent Extractor (`src/openai-intent-extractor.js`)
- [ ] Accepts `(message, conversationHistory, currentClient)` parameters
- [ ] System prompt includes conversation context
- [ ] System prompt uses currentClient as fallback
- [ ] Returns updated currentClient when new one mentioned

### Response Validation
- [ ] First message in session sets currentClient
- [ ] Follow-up messages use stored currentClient
- [ ] Responses are contextually aware
- [ ] No "which client?" errors on follow-ups

---

## Test Execution Plan

### Phase 1: Manual Testing with curl
```bash
# Test 1: First-name matching
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How is Jamie doing?", "sessionId": "test-001"}'

# Test 2: Follow-up context
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me a status update on Brad Goodridge", "sessionId": "test-002"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What tasks were completed this week?", "sessionId": "test-002"}'

# Test 3: Extended conversation
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about Brad Goodridge", "sessionId": "test-003"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is blocking him?", "sessionId": "test-003"}'

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How can we help him improve?", "sessionId": "test-003"}'
```

### Phase 2: Browser Testing
1. Open http://localhost:3000
2. Check browser console for sessionId generation
3. Run Test 2 queries in chat UI
4. Verify follow-up works without re-stating name
5. Refresh page and verify new session starts

### Phase 3: Edge Cases
- Empty message
- Very long conversation (10+ messages)
- Switching between 3+ clients
- Ambiguous client names
- Non-existent client names

---

## Logging & Debugging

### Server Logs to Add
```javascript
console.log('📊 Session:', sessionId);
console.log('👤 Current Client:', session.currentClient);
console.log('💬 Conversation Length:', session.conversationHistory.length);
console.log('🤖 Intent Extracted:', intentResult);
```

### Frontend Logs to Add
```javascript
console.log('🆔 Session ID:', sessionId);
console.log('📤 Sending:', { message, sessionId });
```

---

## Success Definition

**Implementation is successful when:**

1. All 5 test cases pass
2. Technical validation checklist is 100% complete
3. No errors in server logs during testing
4. Follow-up questions work naturally in browser UI
5. User can have multi-turn conversation about a client without repeating name

**Ready for user acceptance when:**
- User can ask: "How is Brad doing?" → "What about his sales?" → "Any blockers?"
- All three queries return Brad's data
- No "which client?" errors
- Conversation feels natural like ChatGPT

---

## Implementation Order

1. **Update `src/openai-intent-extractor.js`**
   - Add conversation context to system prompt
   - Accept history and currentClient parameters

2. **Update `server.js` `/api/chat` endpoint**
   - Extract sessionId from request
   - Create/retrieve session
   - Pass context to intent extractor
   - Store conversation history

3. **Update `public/assets/js/script.js`**
   - Generate UUID sessionId on load
   - Store in sessionStorage
   - Send with every request

4. **Add logging** to all three files

5. **Test with curl** (Phase 1)

6. **Test in browser** (Phase 2)

7. **Fix issues and re-test**

8. **User acceptance test**

---

**Next Step:** Begin implementation with Step 1 (OpenAI Intent Extractor)
