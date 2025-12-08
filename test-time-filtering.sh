#!/bin/bash
# Test time-based filtering feature

SESSION_ID="time-filter-test-$(date +%s)"
API_URL="http://localhost:3000/api/chat"

echo "========================================"
echo "⏰ TIME FILTERING TEST"
echo "========================================"
echo "Session ID: $SESSION_ID"
echo ""

send_test() {
    local num=$1
    local query=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST $num:"
    echo "Query: \"$query\""
    echo ""

    response=$(curl -s -X POST $API_URL \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$query\", \"sessionId\": \"$SESSION_ID\"}")

    echo "Response:"
    echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('response', 'ERROR')[:400])"
    echo ""
    sleep 2
}

# Test 1: No time filter (should show all tasks)
send_test "1" "How is Brad doing?"

# Test 2: Last week filter
send_test "2" "Show me Brad's tasks from the last week"

# Test 3: Last 3 weeks filter
send_test "3" "What has Brad done in the last 3 weeks?"

# Test 4: Last month filter
send_test "4" "Give me Brad's activity from the last month"

# Test 5: Recent activity
send_test "5" "Show me Brad's recent tasks"

# Test 6: Switch client with time filter
send_test "6" "What about Martin's tasks from the last 2 weeks?"

echo "========================================"
echo "✅ TEST COMPLETE"
echo "========================================"
echo ""
echo "Check server logs to see time filter detection:"
echo "Look for: ⏰ Time filter detected: [time_range]"
echo "Look for: 🔍 Filtered to X tasks (time_range)"
echo ""
