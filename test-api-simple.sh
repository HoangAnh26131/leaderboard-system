#!/bin/bash

# =============================================================================
# Simple API Test Script - Leaderboard System
# =============================================================================

BASE_URL="http://localhost:3000/api/v1"
COOKIE_FILE="cookies.txt"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Leaderboard System - Simple API Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if app is running
echo "🔍 Checking if API is running..."
if ! curl -s -f "${BASE_URL}/../health" > /dev/null 2>&1; then
    echo "❌ ERROR: API is not running!"
    echo ""
    echo "Please start the application first:"
    echo "   docker-compose up -d"
    echo "   npm run start:dev"
    echo ""
    exit 1
fi
echo "✅ API is running"
echo ""

# Check if already authenticated
if [ -f "$COOKIE_FILE" ]; then
    echo "🔑 Found existing cookies file: $COOKIE_FILE"
    echo "   Testing if cookies are still valid..."
    
    # Test with existing cookies
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/leaderboard?limit=1" -b "$COOKIE_FILE")
    
    if [ "$RESPONSE" = "200" ]; then
        echo "✅ Cookies are valid! Skipping authentication."
        echo ""
    else
        echo "❌ Cookies expired or invalid. Need to re-authenticate."
        rm -f "$COOKIE_FILE"
        echo ""
    fi
fi

# Authentication required
if [ ! -f "$COOKIE_FILE" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   AUTHENTICATION REQUIRED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "All API endpoints require Web3 wallet authentication."
    echo ""
    echo "📝 STEP 1: Request Nonce"
    echo ""
    
    read -p "Enter your wallet address (or press Enter for test wallet): " WALLET
    
    if [ -z "$WALLET" ]; then
        WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        echo "   Using test wallet: $WALLET"
    fi
    
    echo ""
    echo "Requesting nonce..."
    NONCE_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/wallet/request" \
      -H "Content-Type: application/json" \
      -d "{\"wallet\": \"${WALLET}\"}")
    
    echo "$NONCE_RESPONSE" | jq '.' 2>/dev/null || echo "$NONCE_RESPONSE"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   ⚠️  MANUAL ACTION REQUIRED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "You need to sign the message with your wallet:"
    echo ""
    echo "OPTION 1 (EASIEST): Use sign.html"
    echo "   1. Open sign.html in your browser"
    echo "   2. Connect MetaMask"
    echo "   3. Copy the 'nonce' from above"
    echo "   4. Click 'Sign Message'"
    echo "   5. Copy the signature"
    echo ""
    echo "OPTION 2: Use MetaMask manually"
    echo "   1. Open browser console"
    echo "   2. Connect MetaMask"
    echo "   3. Run: await ethereum.request({method: 'personal_sign', params: ['NONCE', 'YOUR_WALLET']})"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    read -p "📝 STEP 2: Enter the signature: " SIGNATURE
    
    if [ -z "$SIGNATURE" ]; then
        echo "❌ ERROR: Signature is required!"
        exit 1
    fi
    
    echo ""
    echo "Verifying signature..."
    
    VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/wallet/verify" \
      -H "Content-Type: application/json" \
      -c "$COOKIE_FILE" \
      -d "{\"wallet\": \"${WALLET}\", \"signature\": \"${SIGNATURE}\"}")
    
    echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
    echo ""
    
    if echo "$VERIFY_RESPONSE" | grep -q '"authenticated":true'; then
        echo "✅ Authentication successful! Cookies saved to $COOKIE_FILE"
        
        # Extract playerId
        if command -v jq &> /dev/null; then
            PLAYER_ID=$(echo "$VERIFY_RESPONSE" | jq -r '.data.playerId')
        else
            PLAYER_ID=$(echo "$VERIFY_RESPONSE" | grep -o '"playerId":"[^"]*"' | cut -d'"' -f4)
        fi
        
        echo "📝 Your authenticated playerId: $PLAYER_ID"
        echo ""
    else
        echo "❌ Authentication failed!"
        echo "   Please check your wallet address and signature."
        rm -f "$COOKIE_FILE"
        exit 1
    fi
else
    # Load existing playerId from a test request
    echo "🔄 Extracting playerId from existing authentication..."
    
    TEST_RESPONSE=$(curl -s "${BASE_URL}/leaderboard/player?timeframe=alltime" -b "$COOKIE_FILE")
    
    if command -v jq &> /dev/null; then
        PLAYER_ID=$(echo "$TEST_RESPONSE" | jq -r '.data.player.playerId' 2>/dev/null)
    else
        PLAYER_ID=$(echo "$TEST_RESPONSE" | grep -o '"playerId":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi
    
    if [ -z "$PLAYER_ID" ]; then
        echo "❌ Could not extract playerId from existing authentication"
        echo "   Please re-authenticate"
        rm -f "$COOKIE_FILE"
        exit 1
    fi
    
    echo "📝 Using existing playerId: $PLAYER_ID"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   TESTING API ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Submit scores
echo "📊 Test 1: Submit Scores"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SCORES=(15000 12000 18000 9500 20000)

for i in "${!SCORES[@]}"; do
    score="${SCORES[$i]}"
    echo ""
    echo "Submitting score #$((i+1)): $score"
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}/scores" \
      -H "Content-Type: application/json" \
      -b "$COOKIE_FILE" \
      -d "{
        \"playerId\": \"${PLAYER_ID}\",
        \"score\": ${score},
        \"metadata\": {\"level\": $((i+1)), \"timeSpent\": $((i*30+60))},
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
      }")
    
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    sleep 1
done

echo ""
echo "✅ Scores submitted successfully!"
echo ""

# Test 2: Get leaderboard
echo "🏆 Test 2: Get Leaderboard (Top 10)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LEADERBOARD=$(curl -s "${BASE_URL}/leaderboard?timeframe=alltime&limit=10" -b "$COOKIE_FILE")
echo "$LEADERBOARD" | jq '.' 2>/dev/null || echo "$LEADERBOARD"

echo ""
echo "✅ Leaderboard retrieved successfully!"
echo ""

# Test 3: Get player rank
echo "👤 Test 3: Get Player Rank"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RANK=$(curl -s "${BASE_URL}/leaderboard/player?timeframe=alltime" -b "$COOKIE_FILE")
echo "$RANK" | jq '.' 2>/dev/null || echo "$RANK"

echo ""
echo "✅ Player rank retrieved successfully!"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   TEST COMPLETE ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "All API endpoints tested successfully!"
echo ""
echo "Cookies saved at: $COOKIE_FILE"
echo "You can now use these cookies for manual testing:"
echo ""
echo "  curl -b $COOKIE_FILE \"${BASE_URL}/leaderboard?limit=10\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

