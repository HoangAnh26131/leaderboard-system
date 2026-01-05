# 🔐 Authentication Guide

## ⚠️ IMPORTANT: All API endpoints require Web3 wallet authentication!

This leaderboard system uses **JWT-based authentication with Web3 wallet signatures**. You must authenticate before using any API endpoints.

---

## 🚀 Quick Start - Authentication Flow

### Step 1: Request a Nonce

```bash
curl -X POST http://localhost:3000/api/v1/auth/wallet/request \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "nonce": "abc123xyz...",
    "duration": 100,
    "message": "Sign this nonce to authenticate: abc123xyz..."
  }
}
```

---

### Step 2: Sign the Message with Your Wallet

You have 3 options to sign the message:

#### Option A: Use the `sign.html` file (Easiest)
1. Open `sign.html` in your browser
2. Connect your MetaMask wallet
3. Paste the nonce from Step 1
4. Click "Sign Message"
5. Copy the generated signature

#### Option B: Using ethers.js (Programmatic)
```javascript
const { ethers } = require('ethers');

const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY');
const nonce = 'abc123xyz...'; // From Step 1
const signature = await wallet.signMessage(nonce);

console.log('Signature:', signature);
```

#### Option C: Using MetaMask (Browser Console)
```javascript
const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
const nonce = 'abc123xyz...'; // From Step 1
const signature = await ethereum.request({
  method: 'personal_sign',
  params: [nonce, accounts[0]],
});

console.log('Signature:', signature);
```

---

### Step 3: Verify the Signature

```bash
curl -X POST http://localhost:3000/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0x41f00f5c97f8b27091ba7fadd595d7d82661ed7d068f0443bf90054d5ab7dd6d03864fdcbb14a03bb01c2c7fb72f9baad10ff9226e33e89ee9daae723b88c8eb1b"
  }'
```

**Important:** The `-c cookies.txt` flag saves the authentication cookies!

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "authenticated": true
  }
}
```

✅ **You're now authenticated!** The `access_token` and `refresh_token` cookies are saved.

---

### Step 4: Use the Cookies in API Requests

Now you can call all other endpoints using the cookies:

```bash
# Submit a score
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "playerId": "player_001",
    "score": 15000,
    "metadata": {
      "level": 5,
      "timeSpent": 120
    }
  }'

# Get leaderboard
curl -X GET "http://localhost:3000/api/v1/leaderboard?timeframe=alltime&limit=10" \
  -b cookies.txt

# Get player rank
curl -X GET "http://localhost:3000/api/v1/leaderboard/player?playerId=player_001&timeframe=alltime" \
  -b cookies.txt
```

**Important:** Always include `-b cookies.txt` in your requests!

---

## 📱 Testing with Postman

### Setup Authentication in Postman

#### Method 1: Manual Cookie Setup

1. **Request Nonce:**
   - POST `http://localhost:3000/api/v1/auth/wallet/request`
   - Copy the nonce from response

2. **Sign the Message:**
   - Use `sign.html` or MetaMask to sign
   - Copy the signature

3. **Verify Signature:**
   - POST `http://localhost:3000/api/v1/auth/wallet/verify`
   - Go to "Cookies" tab in Postman
   - The `access_token` and `refresh_token` should be automatically saved

4. **Use Other Endpoints:**
   - Cookies are automatically included in subsequent requests
   - Make sure "Automatically follow redirects" is enabled in Postman settings

#### Method 2: Import Collection with Pre-request Script

The Postman collection has been updated with authentication support. After importing:

1. Update the environment variables:
   - `wallet_address`: Your wallet address
   - `wallet_signature`: Your signature (get from sign.html)
   - `wallet_nonce`: Will be auto-fetched

2. The collection will automatically:
   - Request nonce
   - Verify signature
   - Include cookies in all requests

---

## 🔑 Important Notes

### Cookie Storage
- **Access Token**: Valid for 1 day
- **Refresh Token**: Valid for 7 days
- Cookies are **HttpOnly** and stored in the browser/curl cookie file

### Security
- Nonces expire after 100 seconds
- Each nonce can only be used once
- Signatures are verified using EIP-191 standard
- JWT tokens are signed with secret keys

### Troubleshooting

#### Error: "Access token missing"
**Solution:** You forgot to authenticate or include cookies
```bash
# Make sure to include -b cookies.txt in your requests
curl ... -b cookies.txt
```

#### Error: "Access token invalid or expired"
**Solution:** Your token expired, re-authenticate (Steps 1-3)

#### Error: "Nonce expired or already used"
**Solution:** Request a new nonce (Step 1)

#### Error: "Invalid signature"
**Solution:** 
- Make sure you signed the exact nonce string
- Check that your wallet address matches
- Try signing again with MetaMask

---

## 🎯 Complete Example Workflow

### Using cURL

```bash
# 1. Request nonce
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/wallet/request \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}')

echo "$RESPONSE"
# Copy the nonce from response

# 2. Sign the nonce using sign.html or your wallet
# Get the signature

# 3. Verify signature and save cookies
curl -X POST http://localhost:3000/api/v1/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "YOUR_SIGNATURE_HERE"
  }'

# 4. Now you can use the API
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "playerId": "player_001",
    "score": 15000
  }'

# 5. Get leaderboard
curl "http://localhost:3000/api/v1/leaderboard?limit=10" -b cookies.txt

# 6. Get player rank
curl "http://localhost:3000/api/v1/leaderboard/player?playerId=player_001" -b cookies.txt
```

### Using the Automated Script

```bash
# Run the automated script (it will guide you through authentication)
./postman-curl-collection.sh
```

The script will:
1. Request nonce automatically
2. Ask you to sign the message
3. Verify signature and save cookies
4. Run all test requests with authentication

---

## 🛠️ For Developers

### Generating Test Wallets

```javascript
const { ethers } = require('ethers');

// Generate random wallet
const wallet = ethers.Wallet.createRandom();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);

// Sign a message
const nonce = 'test-nonce-123';
const signature = await wallet.signMessage(nonce);
console.log('Signature:', signature);
```

### Environment Variables

Make sure these are set in your `.env`:

```env
JWT_AUTH_WALLET_ACCESS_SECRET=your_access_secret_key
JWT_AUTH_WALLET_ACCESS_EXPIRES_IN=1d

JWT_AUTH_WALLET_REFRESH_SECRET=your_refresh_secret_key
JWT_AUTH_WALLET_REFRESH_EXPIRES_IN=7d
```

---

## 📚 Related Files

- `sign.html` - Web interface for signing messages
- `postman-curl-collection.sh` - Automated testing script with auth
- `Leaderboard-API.postman_collection.json` - Postman collection
- `CURL-COMMANDS.txt` - Individual cURL commands (needs cookies)

---

## ❓ FAQ

**Q: Do I need a real Ethereum wallet?**  
A: For testing, you can use any Ethereum wallet (testnet or mainnet). The system only verifies the signature, not blockchain state.

**Q: Can I use the same wallet for multiple players?**  
A: Yes, the wallet is for authentication. The `playerId` in API requests identifies the player.

**Q: How long do cookies last?**  
A: Access token: 1 day, Refresh token: 7 days

**Q: Can I bypass authentication for testing?**  
A: No, all endpoints require authentication. This is a security feature. Use the automated script for easy testing.

**Q: Where can I get a test wallet?**  
A: Use MetaMask, or generate one programmatically with ethers.js (see "For Developers" section)

---

Need help? Check the `sign.html` file for an easy way to sign messages with MetaMask! 🦊

