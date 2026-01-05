═══════════════════════════════════════════════════════════════════════════
                    LEADERBOARD SYSTEM - API TESTING
═══════════════════════════════════════════════════════════════════════════

⚠️  IMPORTANT: ALL API ENDPOINTS REQUIRE WEB3 WALLET AUTHENTICATION

═══════════════════════════════════════════════════════════════════════════
QUICK START (3 Steps)
═══════════════════════════════════════════════════════════════════════════

1. START THE APPLICATION
   ----------------------
   docker-compose up -d
   npm run start:dev

2. AUTHENTICATE (Choose one option)
   ---------------------------------

   ⭐ EASIEST: Use sign.html
      - Open sign.html in browser
      - Connect MetaMask
      - Click "Sign Message"
      - Done! You're authenticated ✅

   OR Manual cURL:
      # Request nonce
      curl -X POST http://localhost:3000/api/v1/auth/wallet/request \
        -H "Content-Type: application/json" \
        -d '{"wallet": "0xYourWalletAddress"}'
      
      # Sign the nonce (use sign.html or MetaMask)
      
      # Verify signature
      curl -X POST http://localhost:3000/api/v1/auth/wallet/verify \
        -H "Content-Type: application/json" \
        -c cookies.txt \
        -d '{"wallet": "0xYourWalletAddress", "signature": "0xYourSignature"}'

3. TEST THE API
   ------------
   # Submit score
   curl -X POST http://localhost:3000/api/v1/scores \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"playerId": "player_001", "score": 15000}'

   # Get leaderboard
   curl "http://localhost:3000/api/v1/leaderboard?limit=10" -b cookies.txt

   ⚠️  Always include "-b cookies.txt" in your requests!

═══════════════════════════════════════════════════════════════════════════
USING POSTMAN
═══════════════════════════════════════════════════════════════════════════

1. Import Collection:
   File → Import → Leaderboard-API.postman_collection.json

2. Authenticate:
   - Run: "Web3 Wallet Authentication" → "Request Wallet Nonce"
   - Sign the nonce (use sign.html)
   - Run: "Web3 Wallet Authentication" → "Verify Wallet Signature"
   - Cookies are automatically saved ✅

3. Test APIs:
   - All requests now work automatically
   - Try "Score Submission" → "Submit Score - Player 001"

═══════════════════════════════════════════════════════════════════════════
AUTOMATED TESTING SCRIPT
═══════════════════════════════════════════════════════════════════════════

Run the automated script:

   ./postman-curl-collection.sh

It will:
- Request nonce automatically
- Ask you to sign (use sign.html)
- Verify signature and save cookies
- Run all API tests with authentication

═══════════════════════════════════════════════════════════════════════════
AVAILABLE FILES
═══════════════════════════════════════════════════════════════════════════

📄 QUICK-START-TESTING.md          - Fast testing guide
📄 AUTHENTICATION-GUIDE.md          - Complete auth documentation  
📄 API-TESTING-GUIDE.md             - Detailed API testing guide
📄 CURL-COMMANDS.txt                - Copy-paste cURL commands
📄 Leaderboard-API.postman_collection.json  - Postman collection
📄 postman-curl-collection.sh       - Automated test script
📄 sign.html                        - Web UI for wallet signing ⭐

═══════════════════════════════════════════════════════════════════════════
COMMON ERRORS
═══════════════════════════════════════════════════════════════════════════

❌ Error: "Access token missing"
   Solution: Authenticate first and include -b cookies.txt

❌ Error: "Invalid signature"
   Solution: Use sign.html to sign the exact nonce

❌ Error: "Connection refused"
   Solution: Start the app with "npm run start:dev"

═══════════════════════════════════════════════════════════════════════════
RECOMMENDED TESTING FLOW
═══════════════════════════════════════════════════════════════════════════

For beginners:
1. Use sign.html for authentication (easiest)
2. Use Postman for testing APIs (GUI)

For advanced users:
3. Use cURL with cookies.txt
4. Run automated script ./postman-curl-collection.sh

═══════════════════════════════════════════════════════════════════════════

✅ Ready to start? Open sign.html in your browser and connect MetaMask!

For detailed instructions, read: AUTHENTICATION-GUIDE.md

═══════════════════════════════════════════════════════════════════════════

