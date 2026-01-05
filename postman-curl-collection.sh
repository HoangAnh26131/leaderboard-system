#!/bin/bash

# =============================================================================
# Leaderboard System API - cURL Collection
# IMPORTANT: All endpoints require JWT authentication via Web3 wallet
# =============================================================================

BASE_URL="http://localhost:3000/api/v1"
COOKIE_FILE="/tmp/leaderboard-cookies.txt"

echo "Leaderboard System - cURL Collection"
echo "====================================="
echo ""
echo "⚠️  IMPORTANT: All endpoints require authentication!"
echo "    You need to authenticate first to get access token."
echo ""
echo "⚠️  NOTE: Score submissions require sequential levels starting from 1."
echo "    If you've run this script before with the same wallet, you need to"
echo "    either use a NEW wallet or clear the database first:"
echo ""
echo "    To clear database (run in MySQL):"
echo "      DELETE FROM scores; DELETE FROM players;"
echo ""
echo "    To clear Redis:"
echo "      redis-cli FLUSHDB"
echo ""

# =============================================================================
# STEP 0: AUTHENTICATION (REQUIRED FIRST)
# =============================================================================

echo "=== STEP 0: WEB3 WALLET AUTHENTICATION ==="
echo ""

echo "1. Request Nonce for Wallet"
NONCE_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/wallet/request" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }')

echo "$NONCE_RESPONSE"
echo ""

echo "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Copy the 'nonce' from above response"
echo "   2. Sign it with your wallet (MetaMask, etc.)"
echo "   3. Get the signature"
echo "   4. Run the verify command below with your signature"
echo ""
echo "   OR use the sign.html file in the project to sign the message"
echo ""

read -p "Press Enter when you have the signature ready, or Ctrl+C to exit..."

echo ""
echo "2. Enter your wallet address:"
read -p "Wallet: " WALLET_ADDRESS

echo "3. Enter your signature:"
read -p "Signature: " SIGNATURE

echo ""
echo "Verifying signature..."

VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/wallet/verify" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{
    \"wallet\": \"${WALLET_ADDRESS}\",
    \"signature\": \"${SIGNATURE}\"
  }")

echo "$VERIFY_RESPONSE"
echo -e "\n"
echo "✅ Cookies saved to $COOKIE_FILE"
echo ""

# Extract playerId from verification response
if command -v jq &> /dev/null; then
    PLAYER_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.playerId')
else
    PLAYER_ID=$(echo "$VERIFY_RESPONSE" | grep -o '"playerId":"[^"]*"' | cut -d'"' -f4)
fi

echo ""
echo "📝 Your authenticated playerId: $PLAYER_ID"
echo ""

echo "=== NOW TESTING AUTHENTICATED ENDPOINTS ==="
echo ""

# =============================================================================
# 1. SCORE SUBMISSION (REQUIRES AUTH)
# =============================================================================

# NOTE: Levels must be sequential starting from 1
# First submission MUST be level 1
# Each subsequent level can only increase by 1
# IMPORTANT: Need delay between submissions because MySQL writes are async

echo "1. Submit Score - First submission (Level 1)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 1000,
    \"metadata\": {
      \"level\": 1,
      \"timespent\": 30
    },
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\nWaiting for async DB write..."
sleep 2

echo -e "\n2. Submit Score - Second submission (Level 2)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 2500,
    \"metadata\": {
      \"level\": 2,
      \"timespent\": 45
    },
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\nWaiting for async DB write..."
sleep 2

echo -e "\n3. Submit Score - Third submission (Level 3)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 4000,
    \"metadata\": {
      \"level\": 3,
      \"timespent\": 60
    },
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\nWaiting for async DB write..."
sleep 2

echo -e "\n4. Submit Score - Fourth submission (Level 4)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 5500,
    \"metadata\": {
      \"level\": 4,
      \"timespent\": 75
    },
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\nWaiting for async DB write..."
sleep 2

echo -e "\n5. Submit High Score - Fifth submission (Level 5)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 8000,
    \"metadata\": {
      \"level\": 5,
      \"timespent\": 100
    },
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\nWaiting for async DB write..."
sleep 2

# =============================================================================
# 2. LEADERBOARD RETRIEVAL
# =============================================================================

echo -e "\n\n6. Get Leaderboard - All Time (Top 10)"
curl -X GET "${BASE_URL}/leaderboard?timeframe=alltime&limit=10" \
  -b "$COOKIE_FILE"

echo -e "\n\n7. Get Leaderboard - Daily"
curl -X GET "${BASE_URL}/leaderboard?timeframe=daily&limit=20" \
  -b "$COOKIE_FILE"

echo -e "\n\n8. Get Leaderboard - Weekly"
curl -X GET "${BASE_URL}/leaderboard?timeframe=weekly&limit=15" \
  -b "$COOKIE_FILE"

echo -e "\n\n9. Get Leaderboard - Monthly"
curl -X GET "${BASE_URL}/leaderboard?timeframe=monthly&limit=25" \
  -b "$COOKIE_FILE"

echo -e "\n\n10. Get Leaderboard - With Pagination"
curl -X GET "${BASE_URL}/leaderboard?timeframe=alltime&limit=10&offset=0" \
  -b "$COOKIE_FILE"

echo -e "\n\n11. Get Leaderboard - Page 2"
curl -X GET "${BASE_URL}/leaderboard?timeframe=alltime&limit=10&offset=10" \
  -b "$COOKIE_FILE"

echo -e "\n\n12. Get Leaderboard - With Specific Player"
curl -X GET "${BASE_URL}/leaderboard?timeframe=alltime&limit=50&playerId=${PLAYER_ID}" \
  -b "$COOKIE_FILE"

echo -e "\n\n13. Get Leaderboard - Max Limit (1000)"
curl -X GET "${BASE_URL}/leaderboard?timeframe=alltime&limit=1000" \
  -b "$COOKIE_FILE"

# =============================================================================
# 3. PLAYER RANK
# =============================================================================

echo -e "\n\n14. Get Player Rank (All Time)"
curl -X GET "${BASE_URL}/leaderboard/player?timeframe=alltime" \
  -b "$COOKIE_FILE"

echo -e "\n\n15. Get Player Rank (Daily)"
curl -X GET "${BASE_URL}/leaderboard/player?timeframe=daily" \
  -b "$COOKIE_FILE"

echo -e "\n\n16. Get Player Rank (Weekly)"
curl -X GET "${BASE_URL}/leaderboard/player?timeframe=weekly" \
  -b "$COOKIE_FILE"

echo -e "\n\n17. Get Player Rank (Monthly)"
curl -X GET "${BASE_URL}/leaderboard/player?timeframe=monthly" \
  -b "$COOKIE_FILE"

# =============================================================================
# 4. WEB3 WALLET AUTHENTICATION
# =============================================================================

echo -e "\n\n18. Request Wallet Nonce - Wallet 1"
curl -X POST "${BASE_URL}/auth/wallet/request" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

echo -e "\n\n19. Request Wallet Nonce - Wallet 2"
curl -X POST "${BASE_URL}/auth/wallet/request" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0xd30e0B1e076094cD83bB94DAad6d851D7D865540"
  }'

echo -e "\n\n20. Verify Wallet Signature (EXPECTED TO FAIL - testing invalid signature rejection)"
echo "    This test uses a stale signature that doesn't match the current nonce."
echo "    Expected: 401 Invalid signature"
curl -X POST "${BASE_URL}/auth/wallet/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0xd30e0B1e076094cD83bB94DAad6d851D7D865540",
    "signature": "0x41f00f5c97f8b27091ba7fadd595d7d82661ed7d068f0443bf90054d5ab7dd6d03864fdcbb14a03bb01c2c7fb72f9baad10ff9226e33e89ee9daae723b88c8eb1b"
  }'

# =============================================================================
# 5. VALIDATION & ERROR TESTING
# =============================================================================

echo -e "\n\n21. Test Negative Score (Should Fail)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": -1000,
    \"metadata\": {\"level\": 6, \"timespent\": 30},
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\n22. Test Score Over Limit (Should Fail)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 2000000,
    \"metadata\": {\"level\": 6, \"timespent\": 30},
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

echo -e "\n\n23. Test Invalid Timeframe (Should Fail)"
curl -X GET "${BASE_URL}/leaderboard?timeframe=invalid" \
  -b "$COOKIE_FILE"

echo -e "\n\n24. Test Missing PlayerId (Should Fail)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"score\": 5000,
    \"metadata\": {\"level\": 1, \"timespent\": 10},
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

# =============================================================================
# 6. RATE LIMITING TEST
# =============================================================================

echo -e "\n\n=== RATE LIMIT TESTS ==="
echo "NOTE: These tests ONLY work if:"
echo "  1. You cleared the database before running this script"
echo "  2. Tests 1-5 (score submissions) completed successfully"
echo "  3. Player's last level is 5"
echo ""
echo "If you see 'Impossible jump' errors, it means the player already has"
echo "scores from a previous run. Clear the database and run again."
echo ""

# Rate limit tests use sequential levels continuing from submission tests
echo -e "\n25. Rate Limit Test - Request 1 (Level 6)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 100,
    \"metadata\": {\"level\": 6, \"timespent\": 15},
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

sleep 2

echo -e "\n\n26. Rate Limit Test - Request 2 (Level 7)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 200,
    \"metadata\": {\"level\": 7, \"timespent\": 15},
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

sleep 2

echo -e "\n\n27. Rate Limit Test - Request 3 (Level 8)"
curl -X POST "${BASE_URL}/scores" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"playerId\": \"${PLAYER_ID}\",
    \"score\": 300,
    \"metadata\": {\"level\": 8, \"timespent\": 15},
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"

# Continue with more requests to test rate limiting...

echo -e "\n\nCollection Complete!"
echo "Cookies saved at: $COOKIE_FILE"

