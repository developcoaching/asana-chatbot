#!/bin/bash
# ELABORATE CHATBOT TEST
# Tests: Brad, Jessie, context switching, various question types
# Testing conversation memory, client switching, and intent understanding

SESSION_ID="elaborate-test-$(date +%s)"
API_URL="http://localhost:3000/api/chat"

# Color codes for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================"
echo "🧪 ELABORATE CHATBOT TEST"
echo "========================================"
echo "Session ID: $SESSION_ID"
echo "Testing: Brad & Jessie with context switching"
echo "========================================"
echo ""

# Function to send message and display response
send_message() {
    local test_num=$1
    local message=$2
    local expected=$3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TEST $test_num${NC}"
    echo -e "${GREEN}➤ User:${NC} \"$message\""
    echo -e "${YELLOW}Expected:${NC} $expected"
    echo ""

    # Send request and capture full response
    response=$(curl -s -X POST $API_URL \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$message\", \"sessionId\": \"$SESSION_ID\"}")

    # Extract response text
    bot_response=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('response', 'ERROR'))" 2>/dev/null)

    # Extract detected client
    detected_client=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('detectedClient', 'NONE'))" 2>/dev/null)

    echo -e "${GREEN}✓ Bot Response:${NC}"
    echo "$bot_response" | head -c 400
    if [ ${#bot_response} -gt 400 ]; then
        echo "..."
    fi
    echo ""
    echo -e "${BLUE}Detected Client:${NC} $detected_client"
    echo ""

    sleep 2
}

# ============================================
# PHASE 1: Initial Brad Questions
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 1: Initial Brad Questions     ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "1.1" \
    "How is Brad doing?" \
    "Should detect Brad and show his project status"

send_message "1.2" \
    "What are his top priorities?" \
    "Should remember Brad from previous message"

send_message "1.3" \
    "Tell me about his sales performance" \
    "Should still be in Brad's context"

send_message "1.4" \
    "Is he on track this week?" \
    "Should maintain Brad context with pronoun 'he'"

# ============================================
# PHASE 2: Switch to Jessie
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 2: Switch to Jessie            ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "2.1" \
    "What about Jessie?" \
    "Should switch context to Jessie"

send_message "2.2" \
    "How is her project going?" \
    "Should maintain Jessie context with pronoun 'her'"

send_message "2.3" \
    "What are her overdue tasks?" \
    "Should still be talking about Jessie"

send_message "2.4" \
    "Tell me about her cashflow" \
    "Should understand 'her' refers to Jessie"

# ============================================
# PHASE 3: Switch Back to Brad
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 3: Switch Back to Brad         ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "3.1" \
    "Go back to Brad" \
    "Should explicitly switch back to Brad"

send_message "3.2" \
    "What's his progress percentage?" \
    "Should be in Brad's context"

send_message "3.3" \
    "Any blockers?" \
    "Should infer we're still talking about Brad"

# ============================================
# PHASE 4: Rapid Context Switching
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 4: Rapid Context Switching     ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "4.1" \
    "Compare Brad and Jessie" \
    "Should handle both clients in one question"

send_message "4.2" \
    "Who's performing better?" \
    "Should compare both clients"

send_message "4.3" \
    "Tell me about Brad's tasks" \
    "Should switch back to Brad only"

send_message "4.4" \
    "What about Jessie's tasks?" \
    "Should switch to Jessie"

# ============================================
# PHASE 5: Ambiguous Pronoun Tests
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 5: Ambiguous Pronouns          ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "5.1" \
    "What about their revenue?" \
    "Should maintain Jessie context (last mentioned)"

send_message "5.2" \
    "How are things going overall?" \
    "Very generic - should ask which client or use last context"

send_message "5.3" \
    "Show me the metrics" \
    "Generic request - should clarify or use current context"

# ============================================
# PHASE 6: Different Question Types
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 6: Different Question Types    ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "6.1" \
    "How is Brad's team doing?" \
    "Switch to Brad, team-related question"

send_message "6.2" \
    "What are his deadlines?" \
    "Brad context, deadline-focused question"

send_message "6.3" \
    "Any risks I should know about?" \
    "Should maintain Brad context, risk analysis"

send_message "6.4" \
    "What should I coach him on?" \
    "Brad context, coaching recommendation request"

# ============================================
# PHASE 7: First Name Only Tests
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 7: First Name Only             ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "7.1" \
    "Jessie status?" \
    "Very short query with first name only"

send_message "7.2" \
    "Brad update" \
    "Even shorter - just name + intent word"

send_message "7.3" \
    "Check on Jessie" \
    "Natural conversational style"

# ============================================
# PHASE 8: Complex Context Maintenance
# ============================================
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 8: Complex Context Tests       ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo ""

send_message "8.1" \
    "How is Brad's construction project?" \
    "Brad with industry-specific context"

send_message "8.2" \
    "What about site inspections?" \
    "Should maintain Brad context, specific topic"

send_message "8.3" \
    "Are permits approved?" \
    "Should still be Brad, construction-specific"

send_message "8.4" \
    "Switch to Jessie - how are her permits?" \
    "Explicit switch + specific question"

# ============================================
# FINAL SUMMARY
# ============================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TEST COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Tests: 24"
echo "Session ID: $SESSION_ID"
echo ""
echo -e "${YELLOW}KEY BEHAVIORS TO OBSERVE:${NC}"
echo "1. ✓ First-name matching (Brad/Jessie → full names)"
echo "2. ✓ Context switching when new name mentioned"
echo "3. ✓ Context maintenance with pronouns (he/his, she/her)"
echo "4. ✓ Handling generic questions without losing context"
echo "5. ✓ Explicit switching ('Go back to Brad')"
echo "6. ✓ Different question types (status, tasks, metrics, coaching)"
echo "7. ✓ Short queries ('Jessie status?')"
echo "8. ✓ Industry-specific context (construction terms)"
echo ""
echo -e "${YELLOW}KNOWN ISSUES TO WATCH FOR:${NC}"
echo "- Context loss on very generic questions"
echo "- Ambiguous pronouns without clear subject"
echo "- Rapid switching between clients"
echo ""
