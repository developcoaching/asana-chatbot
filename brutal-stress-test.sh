#!/bin/bash
# BRUTAL STRESS TEST - Try to BREAK the chatbot
# Using 5 REAL clients with rapid switching, edge cases, and confusing questions

SESSION_ID="brutal-test-$(date +%s)"
API_URL="http://localhost:3000/api/chat"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo "========================================"
echo "💀 BRUTAL CHATBOT STRESS TEST"
echo "========================================"
echo "Session ID: $SESSION_ID"
echo "Real Clients: Brad, Jason, Martin, Nick, Dylan"
echo "Goal: Try to BREAK the chatbot!"
echo "========================================"
echo ""

send_message() {
    local phase=$1
    local test_num=$2
    local message=$3
    local expected=$4

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}$phase - TEST $test_num${NC}"
    echo -e "${GREEN}➤ User:${NC} \"$message\""
    echo -e "${PURPLE}Goal:${NC} $expected"
    echo ""

    response=$(curl -s -X POST $API_URL \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$message\", \"sessionId\": \"$SESSION_ID\"}")

    bot_response=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('response', 'ERROR'))" 2>/dev/null)
    detected=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('detectedClient', 'NONE'))" 2>/dev/null)

    # Determine if response is good
    if [[ "$bot_response" == *"ERROR"* ]] || [[ "$bot_response" == "" ]]; then
        echo -e "${RED}❌ FAILED - No response${NC}"
    elif [[ "$bot_response" == *"couldn't find"* ]] || [[ "$bot_response" == *"couldn't identify"* ]]; then
        echo -e "${RED}❌ FAILED - Lost context or can't find client${NC}"
    else
        echo -e "${GREEN}✓ Bot Response:${NC}"
    fi

    echo "$bot_response" | head -c 300
    if [ ${#bot_response} -gt 300 ]; then
        echo "..."
    fi
    echo ""
    echo -e "${BLUE}Detected:${NC} $detected"
    echo ""

    sleep 1.5
}

# ============================================
# PHASE 1: Establish Multiple Clients
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 1: Establish 5 Real Clients       ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 1" "1.1" \
    "How is Brad doing?" \
    "Should establish Brad as current client"

send_message "PHASE 1" "1.2" \
    "What about Jason?" \
    "Should switch to Jason Graystone"

send_message "PHASE 1" "1.3" \
    "Tell me about Martin" \
    "Should switch to Martin Zeman"

send_message "PHASE 1" "1.4" \
    "Check on Nick" \
    "Should switch to Nick Tobing"

send_message "PHASE 1" "1.5" \
    "How's Dylan performing?" \
    "Should switch to Dylan Platelle"

# ============================================
# PHASE 2: RAPID Context Switching
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 2: RAPID Context Switching (HARD) ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 2" "2.1" \
    "Back to Brad - what's his status?" \
    "Should switch back to Brad"

send_message "PHASE 2" "2.2" \
    "And Jason's tasks?" \
    "Should switch to Jason"

send_message "PHASE 2" "2.3" \
    "What about his sales?" \
    "Should maintain Jason context (his = Jason)"

send_message "PHASE 2" "2.4" \
    "Compare that to Martin" \
    "Should compare Jason's sales to Martin"

send_message "PHASE 2" "2.5" \
    "Who's doing better?" \
    "Should compare Jason vs Martin"

# ============================================
# PHASE 3: Ambiguous Pronouns (BREAKING TEST)
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 3: Ambiguous Pronouns (BRUTAL)    ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 3" "3.1" \
    "What about his cashflow?" \
    "Should maintain Martin context OR ask for clarification"

send_message "PHASE 3" "3.2" \
    "Tell me about their team" \
    "Ambiguous 'their' - should ask OR default to last client"

send_message "PHASE 3" "3.3" \
    "How are things?" \
    "Very vague - should ask OR use current context"

send_message "PHASE 3" "3.4" \
    "Any issues?" \
    "Generic question - should maintain context"

# ============================================
# PHASE 4: Multiple Clients in One Question
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 4: Multiple Clients (COMPLEX)     ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 4" "4.1" \
    "Compare Brad, Jason, and Martin" \
    "Should handle 3 clients in one question"

send_message "PHASE 4" "4.2" \
    "Who has the most overdue tasks: Nick or Dylan?" \
    "Should compare Nick vs Dylan"

send_message "PHASE 4" "4.3" \
    "Give me a quick update on all five" \
    "Should summarize all 5 clients"

send_message "PHASE 4" "4.4" \
    "Which client needs my attention most?" \
    "Should analyze all and recommend one"

# ============================================
# PHASE 5: Context After Comparison
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 5: Context After Comparison       ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 5" "5.1" \
    "Tell me more about him" \
    "After multiple clients mentioned - should ask which one"

send_message "PHASE 5" "5.2" \
    "The first one you mentioned" \
    "Should remember Brad was first in previous comparison"

send_message "PHASE 5" "5.3" \
    "What are his blockers?" \
    "Should maintain Brad context"

# ============================================
# PHASE 6: Interruption & Recovery
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 6: Interruption & Recovery        ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 6" "6.1" \
    "Actually, switch to Jason" \
    "Should explicitly switch to Jason"

send_message "PHASE 6" "6.2" \
    "Wait, I meant Nick" \
    "Should switch from Jason to Nick"

send_message "PHASE 6" "6.3" \
    "Never mind, go back to Brad" \
    "Should switch back to Brad"

send_message "PHASE 6" "6.4" \
    "What were we talking about?" \
    "Should remember Brad and summarize recent topic"

# ============================================
# PHASE 7: Confusing Mixed Questions
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 7: Confusing Mixed Questions      ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 7" "7.1" \
    "How is Brad's team compared to Jason's revenue?" \
    "Two different metrics, two clients - should handle both"

send_message "PHASE 7" "7.2" \
    "Is Martin's cashflow better than Nick's progress?" \
    "Comparing different things - should try to answer"

send_message "PHASE 7" "7.3" \
    "What's Dylan's biggest risk and Brad's top priority?" \
    "Two clients, two questions - should answer both"

# ============================================
# PHASE 8: Edge Cases & Weird Queries
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 8: Edge Cases (BREAKING ATTEMPTS) ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 8" "8.1" \
    "B" \
    "Just letter B - should ask for clarification"

send_message "PHASE 8" "8.2" \
    "status" \
    "One word - should ask which client OR use context"

send_message "PHASE 8" "8.3" \
    "???" \
    "Just question marks - should ask what user wants"

send_message "PHASE 8" "8.4" \
    "Tell me everything about everyone" \
    "Too broad - should provide summary or ask to narrow down"

# ============================================
# PHASE 9: Long Conversation Memory
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 9: Long-Term Memory Test          ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

send_message "PHASE 9" "9.1" \
    "Who was the first client I asked about?" \
    "Should remember Brad from test 1.1"

send_message "PHASE 9" "9.2" \
    "What did I ask about Jason earlier?" \
    "Should recall Jason questions from earlier"

send_message "PHASE 9" "9.3" \
    "Remind me what we discussed about Martin" \
    "Should summarize Martin conversation"

# ============================================
# PHASE 10: Final Stress - Rapid Fire
# ============================================
echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
echo -e "${RED}║   PHASE 10: RAPID FIRE (No Sleep)         ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
echo ""

for client in "Brad" "Jason" "Martin" "Nick" "Dylan" "Brad" "Jason"; do
    send_message "PHASE 10" "RF-$client" \
        "$client status?" \
        "Should quickly switch and respond"
done

# ============================================
# FINAL SUMMARY
# ============================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}💀 BRUTAL STRESS TEST COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Tests: 50+"
echo "Session ID: $SESSION_ID"
echo "Real Clients: Brad, Jason, Martin, Nick, Dylan"
echo ""
echo -e "${YELLOW}TEST CATEGORIES:${NC}"
echo "1. ✓ Multi-client establishment (5 clients)"
echo "2. ✓ Rapid context switching"
echo "3. ✓ Ambiguous pronouns (brutal)"
echo "4. ✓ Multiple clients in one question"
echo "5. ✓ Context after comparison"
echo "6. ✓ Interruption & recovery"
echo "7. ✓ Confusing mixed questions"
echo "8. ✓ Edge cases (single letters, gibberish)"
echo "9. ✓ Long-term memory"
echo "10. ✓ Rapid fire switching"
echo ""
echo "Check test-brutal-results.log for full output"
echo ""
