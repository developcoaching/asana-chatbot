#!/bin/bash
# Test conversation context with multiple clients
# Testing: Ask about Brad → Ask about Jamie → Go back to Brad → Ask specific questions

SESSION_ID="test-context-$(date +%s)"
API_URL="http://localhost:3000/api/chat"

echo "================================"
echo "CONVERSATION CONTEXT TEST"
echo "Session ID: $SESSION_ID"
echo "================================"
echo ""

# Test 1: Ask about Brad
echo "TEST 1: Asking about Brad..."
echo "➤ User: 'How is Brad doing?'"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How is Brad doing?\", \"sessionId\": \"$SESSION_ID\"}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print('✓ Bot:', data.get('response', 'ERROR')[:200] + '...\n')" 2>/dev/null
sleep 2

# Test 2: Ask about Jamie
echo "TEST 2: Switching to Jamie..."
echo "➤ User: 'What about Jamie?'"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What about Jamie?\", \"sessionId\": \"$SESSION_ID\"}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print('✓ Bot:', data.get('response', 'ERROR')[:200] + '...\n')" 2>/dev/null
sleep 2

# Test 3: Go back to Brad (should remember)
echo "TEST 3: Going back to Brad (context test)..."
echo "➤ User: 'Tell me more about his sales' (referring to Brad)"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Tell me more about his sales\", \"sessionId\": \"$SESSION_ID\"}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print('✓ Bot:', data.get('response', 'ERROR')[:200] + '...\n')" 2>/dev/null
sleep 2

# Test 4: Specific question without naming Brad
echo "TEST 4: Specific follow-up (should still know we're talking about Brad)..."
echo "➤ User: 'What about his cashflow?'"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What about his cashflow?\", \"sessionId\": \"$SESSION_ID\"}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print('✓ Bot:', data.get('response', 'ERROR')[:200] + '...\n')" 2>/dev/null

echo ""
echo "================================"
echo "TEST COMPLETE"
echo "================================"
echo ""
echo "EXPECTED BEHAVIOR:"
echo "- Test 1: Should get Brad's data"
echo "- Test 2: Should switch to Jamie"
echo "- Test 3: Should remember we're asking about Brad's sales"
echo "- Test 4: Should still be in Brad's context for cashflow question"
echo ""
echo "CURRENT ISSUE:"
echo "Bot likely forgets context between messages (no session storage implemented yet)"
