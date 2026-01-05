# 🔍 Issue Fixed: Authentication Required for All APIs

## What Was the Problem?

You got this error when running `./postman-curl-collection.sh`:

```json
{"statusCode":401,"message":"Access token missing"}
```

### Root Cause

**All API endpoints require JWT authentication via Web3 wallet.** The original cURL collection didn't include authentication, so all requests were being rejected.

---

## ✅ What I Fixed

### 1. Updated `postman-curl-collection.sh`
- Added authentication flow at the beginning
- All cURL commands now include `-b cookies.txt` to use authentication cookies
- Script guides you through the signing process

### 2. Created New Documentation Files

| File | Purpose |
|------|---------|
| **AUTHENTICATION-GUIDE.md** | Complete guide to Web3 wallet authentication |
| **QUICK-START-TESTING.md** | Fast 3-step testing guide |
| **TESTING-README.txt** | Quick reference for testing |
| **test-api-simple.sh** | Simplified automated test script |

### 3. Updated Postman Collection
- All requests properly configured for authentication
- Environment variables for easy setup

---

## 🚀 How to Test Now (3 Easy Ways)

### Option 1: Simple Automated Script (EASIEST) ⭐

```bash
./test-api-simple.sh
```

This script will:
1. Check if API is running
2. Guide you through authentication
3. Test all major endpoints automatically
4. Save cookies for future use

### Option 2: Use sign.html + Manual cURL

```bash
# 1. Open sign.html in browser and authenticate
#    (This saves cookies automatically in the browser)

# 2. For cURL, authenticate manually:
curl -X POST http://localhost:3000/api/v1/auth/wallet/request \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0xYourWalletAddress"}'

# 3. Sign the nonce (use sign.html or MetaMask)

# 4. Verify signature
curl -X POST http://localhost:3000/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"wallet": "0xYourWallet", "signature": "0xYourSignature"}'

# 5. Now test APIs with cookies
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"playerId": "player_001", "score": 15000}'
```

### Option 3: Use Postman

```
1. Import: Leaderboard-API.postman_collection.json
2. Run: "Web3 Wallet Authentication" → "Request Wallet Nonce"
3. Sign with MetaMask or sign.html
4. Run: "Verify Wallet Signature" (paste wallet & signature)
5. All other requests now work automatically! ✅
```

---

## 📚 Complete Documentation Index

### Quick Start
- **TESTING-README.txt** - Quick reference (read this first!)
- **QUICK-START-TESTING.md** - 3-step testing guide

### Detailed Guides
- **AUTHENTICATION-GUIDE.md** - Complete authentication documentation
- **API-TESTING-GUIDE.md** - Comprehensive API testing guide

### Testing Tools
- **test-api-simple.sh** - Automated testing script (recommended)
- **postman-curl-collection.sh** - Full test suite with auth
- **Leaderboard-API.postman_collection.json** - Postman collection
- **sign.html** - Web UI for wallet signing

### Reference
- **CURL-COMMANDS.txt** - Individual cURL commands
- **README.md** - Full project documentation

---

## 🎯 Recommended Testing Flow

### For First-Time Users:

```
1. Start app: npm run start:dev
2. Run: ./test-api-simple.sh
3. Follow the prompts (use sign.html for signing)
4. Done! ✅
```

### For Postman Users:

```
1. Import collection
2. Authenticate (2 requests)
3. Test all endpoints via GUI
```

### For Advanced Users:

```
1. Authenticate manually with cURL
2. Save cookies.txt
3. Use individual cURL commands
```

---

## 🔑 Authentication Overview

### Why Authentication?

This leaderboard system uses **Web3 wallet authentication** for security. All endpoints require a valid JWT token obtained by signing a message with your Ethereum wallet.

### Authentication Flow

```
1. Request Nonce
   POST /api/v1/auth/wallet/request
   {"wallet": "0xYourAddress"}
   
2. Sign Message
   Use MetaMask/sign.html to sign the nonce
   
3. Verify Signature
   POST /api/v1/auth/wallet/verify
   {"wallet": "0xYour Address", "signature": "0xSignature"}
   → Returns access_token and refresh_token cookies
   
4. Use APIs
   Include cookies in all requests
   → curl -b cookies.txt ...
```

### Token Lifetime

- **Access Token**: 1 day
- **Refresh Token**: 7 days
- After expiry, re-authenticate (Steps 1-3)

---

## 🐛 Common Errors & Solutions

### Error: "Access token missing"

**Cause:** No authentication or missing cookies

**Solution:**
```bash
# Make sure to authenticate and use cookies
curl -c cookies.txt ...  # Save cookies
curl -b cookies.txt ...  # Use cookies
```

### Error: "Invalid signature"

**Cause:** Wrong signature or wallet mismatch

**Solution:**
- Use the exact nonce from the API response
- Sign with the correct wallet
- Use `sign.html` for easier signing

### Error: "Nonce expired or already used"

**Cause:** Nonce is only valid for 100 seconds and single use

**Solution:**
- Request a new nonce
- Sign and verify within 100 seconds

### Error: "Connection refused"

**Cause:** API not running

**Solution:**
```bash
docker-compose up -d
npm run start:dev
```

---

## 📝 Example: Complete Testing Session

```bash
# 1. Start services
docker-compose up -d
npm run start:dev

# 2. Run automated test
./test-api-simple.sh

# Enter your wallet (or press Enter for test wallet)
# Sign the message using sign.html
# Paste the signature

# The script will automatically:
# - Authenticate
# - Submit scores for 5 players
# - Retrieve leaderboard
# - Get player rank
# - Save cookies for future use

# 3. Manual testing with saved cookies
curl "http://localhost:3000/api/v1/leaderboard?limit=10" -b cookies.txt | jq
```

---

## 🎓 Next Steps

1. **Read:** TESTING-README.txt (2 minutes)
2. **Test:** Run `./test-api-simple.sh` (5 minutes)
3. **Explore:** Try Postman collection (optional)
4. **Learn:** Read AUTHENTICATION-GUIDE.md for details

---

## 💡 Pro Tips

### 1. Save Multiple Cookie Files
```bash
# Different wallets/players
curl -c cookies-wallet1.txt ...
curl -c cookies-wallet2.txt ...
```

### 2. Check Token Expiry
```bash
# If you get "access token invalid", just re-authenticate
./test-api-simple.sh  # Detects expired tokens
```

### 3. Pretty Print JSON
```bash
curl ... | jq  # Requires jq: brew install jq
```

### 4. Test Different Timeframes
```bash
curl "http://localhost:3000/api/v1/leaderboard?timeframe=daily" -b cookies.txt
curl "http://localhost:3000/api/v1/leaderboard?timeframe=weekly" -b cookies.txt
curl "http://localhost:3000/api/v1/leaderboard?timeframe=monthly" -b cookies.txt
```

### 5. Postman Auto-Authentication
- Set up environment variables once
- All requests use cookies automatically
- No need to manually include cookies

---

## 🎉 Summary

**Problem:** API requires authentication  
**Solution:** Multiple easy-to-use testing methods provided

**Easiest Way:**
```bash
./test-api-simple.sh
```

**Any questions?** Check the documentation files or the error troubleshooting section above!

---

**Happy Testing! 🚀**

