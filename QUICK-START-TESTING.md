# 🚀 Quick Start - Testing the API

## ⚠️ IMPORTANT

**ALL API endpoints require Web3 wallet authentication!**  
You must authenticate first before testing any endpoint.

---

## 🎯 Fastest Way to Test (3 Steps)

### Step 1: Start the Application

```bash
# Make sure Docker services are running
docker-compose up -d

# Start the app
npm run start:dev
```

### Step 2: Authenticate with Web3 Wallet

**Option A: Use sign.html (Easiest - 30 seconds)** ⭐

1. Open `sign.html` in your browser
2. Connect MetaMask wallet
3. The page will automatically:
   - Request nonce from API
   - Show you the message to sign
   - Sign the message with MetaMask
   - Verify the signature
   - Store authentication cookies
4. **You're authenticated!** ✅

**Option B: Manual cURL (Advanced)**

```bash
# 1. Request nonce
curl -X POST http://localhost:3000/api/v1/auth/wallet/request \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0xYourWalletAddress"}'

# 2. Sign the nonce with your wallet (use sign.html or MetaMask)

# 3. Verify signature
curl -X POST http://localhost:3000/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "wallet": "0xYourWalletAddress",
    "signature": "0xYourSignature"
  }'
```

### Step 3: Test the APIs

```bash
# Submit a score
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "playerId": "player_001",
    "score": 15000,
    "metadata": {"level": 5, "timeSpent": 120}
  }'

# Get leaderboard
curl "http://localhost:3000/api/v1/leaderboard?timeframe=alltime&limit=10" \
  -b cookies.txt
```

**Don't forget `-b cookies.txt` in every request!**

---

## 📱 Using Postman (Recommended)

### 1. Import the Collection

```
File → Import → Leaderboard-API.postman_collection.json
```

### 2. Authenticate

Run these requests in order:
1. **Web3 Wallet Authentication** → **Request Wallet Nonce**
2. Copy the nonce, sign it with MetaMask or sign.html
3. **Web3 Wallet Authentication** → **Verify Wallet Signature**
   - Paste your wallet and signature
   - Cookies will be automatically saved

### 3. Test Other Endpoints

Now all requests will work! Postman automatically includes the cookies.

Try these:
- **Score Submission** → **Submit Score - Player 001**
- **Leaderboard Retrieval** → **Get Leaderboard - All Time**
- **Player Rank** → **Get Player Rank - Player 001**

---

## 🤖 Automated Testing Script

Use the automated bash script that handles authentication for you:

```bash
# Run the script
./postman-curl-collection.sh

# It will:
# 1. Request nonce automatically
# 2. Ask you to sign (use sign.html)
# 3. Verify and save cookies
# 4. Run all API tests
```

---

## 🎮 Complete Testing Scenario

### Create a leaderboard with multiple players:

```bash
# Authenticate first (Steps 1-2 above)

# Submit scores for 5 players
curl -X POST http://localhost:3000/api/v1/scores -H "Content-Type: application/json" -b cookies.txt -d '{"playerId": "alice", "score": 15000}'
curl -X POST http://localhost:3000/api/v1/scores -H "Content-Type: application/json" -b cookies.txt -d '{"playerId": "bob", "score": 12000}'
curl -X POST http://localhost:3000/api/v1/scores -H "Content-Type: application/json" -b cookies.txt -d '{"playerId": "charlie", "score": 18000}'
curl -X POST http://localhost:3000/api/v1/scores -H "Content-Type: application/json" -b cookies.txt -d '{"playerId": "david", "score": 9500}'
curl -X POST http://localhost:3000/api/v1/scores -H "Content-Type: application/json" -b cookies.txt -d '{"playerId": "eve", "score": 20000}'

# View the leaderboard
curl "http://localhost:3000/api/v1/leaderboard?timeframe=alltime&limit=10" -b cookies.txt | jq

# Expected ranking:
# 1. eve (20000)
# 2. charlie (18000)
# 3. alice (15000)
# 4. bob (12000)
# 5. david (9500)
```

---

## 🐛 Troubleshooting

### Error: "Access token missing"

**Problem:** You didn't authenticate or forgot to include cookies

**Solution:**
```bash
# Make sure you authenticated and saved cookies
curl ... -c cookies.txt  # Save cookies (-c)
curl ... -b cookies.txt  # Use cookies (-b)
```

### Error: "Connection refused"

**Problem:** Application not running

**Solution:**
```bash
docker-compose up -d
npm run start:dev
```

### Error: "Invalid signature"

**Problem:** Signature doesn't match the nonce or wallet

**Solution:**
- Use the exact nonce from the request
- Sign with the same wallet address
- Use `sign.html` for easier signing

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `AUTHENTICATION-GUIDE.md` | Complete authentication documentation |
| `API-TESTING-GUIDE.md` | Detailed API testing guide |
| `CURL-COMMANDS.txt` | Copy-paste cURL commands |
| `Leaderboard-API.postman_collection.json` | Postman collection |
| `sign.html` | Web UI for wallet signing |

---

## 🎯 Next Steps

1. ✅ Read `AUTHENTICATION-GUIDE.md` for detailed auth info
2. ✅ Use `sign.html` for easy MetaMask signing
3. ✅ Import Postman collection for GUI testing
4. ✅ Run `./postman-curl-collection.sh` for automated tests
5. ✅ Check `API-TESTING-GUIDE.md` for advanced scenarios

---

## 💡 Pro Tips

1. **Save cookies properly:**
   ```bash
   # Always use -c to save and -b to read
   curl ... -c cookies.txt  # Save
   curl ... -b cookies.txt  # Use
   ```

2. **Pretty JSON output:**
   ```bash
   curl ... | jq
   ```

3. **Postman cookies:**
   - Cookies are automatically handled
   - Check View → Show Cookies

4. **Token expiry:**
   - Access token: 1 day
   - Just re-authenticate when expired

5. **Multiple environments:**
   - Save different cookie files for different wallets
   - `cookies-wallet1.txt`, `cookies-wallet2.txt`

---

**Ready to test? Start with `sign.html` for easy authentication!** 🦊✨

