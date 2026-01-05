# 🚀 API Testing Guide

This directory contains multiple ways to test the Leaderboard System API.

## 📦 Available Files

### 1. **Leaderboard-API.postman_collection.json** ⭐ RECOMMENDED
**Best for Postman users**

**How to Import:**
1. Open Postman
2. Click **"Import"** button (top left)
3. Click **"Upload Files"**
4. Select `Leaderboard-API.postman_collection.json`
5. Click **"Import"**

**Features:**
- ✅ 27 pre-configured API requests
- ✅ Organized into folders (Score Submission, Leaderboard, etc.)
- ✅ Uses environment variables ({{base_url}})
- ✅ Includes validation tests
- ✅ Rate limiting tests
- ✅ Web3 authentication flows

---

### 2. **CURL-COMMANDS.txt**
**Best for quick copy-paste**

**How to Use:**
1. Open `CURL-COMMANDS.txt`
2. Copy any cURL command
3. Paste in terminal or Postman's "Import" → "Raw Text"
4. Execute

**Features:**
- ✅ Ready-to-use cURL commands
- ✅ Organized by API category
- ✅ Includes validation tests
- ✅ Rate limiting test scripts

---

### 3. **postman-curl-collection.sh**
**Best for automated testing**

**How to Use:**
```bash
# Make executable (already done)
chmod +x postman-curl-collection.sh

# Run all tests
./postman-curl-collection.sh

# Run and save output
./postman-curl-collection.sh > test-results.txt
```

**Features:**
- ✅ Runs all 27 tests sequentially
- ✅ Bash script format
- ✅ Easy to customize
- ✅ Can be used in CI/CD pipelines

---

## 🎯 Quick Start

### Option 1: Postman (Recommended)

1. **Import Collection:**
   ```
   Postman → Import → Leaderboard-API.postman_collection.json
   ```

2. **Setup Environment (Optional):**
   - Create new environment
   - Add variable: `base_url` = `http://localhost:3000/api/v1`

3. **Start Testing:**
   - Expand folders in left sidebar
   - Click any request
   - Click "Send" button

---

### Option 2: cURL (Terminal)

1. **Start the application:**
   ```bash
   npm run start:dev
   ```

2. **Open CURL-COMMANDS.txt and copy any command**

3. **Example - Submit Score:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/scores \
     -H "Content-Type: application/json" \
     -d '{
       "playerId": "player_001",
       "score": 15000,
       "metadata": {
         "level": 5,
         "timeSpent": 120
       }
     }'
   ```

4. **Pretty output with jq:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/leaderboard?limit=10" | jq
   ```

---

## 📋 Testing Workflow

### Complete Testing Scenario

1. **Submit Multiple Scores:**
   ```bash
   # Player 1
   curl -X POST http://localhost:3000/api/v1/scores \
     -H "Content-Type: application/json" \
     -d '{"playerId": "player_001", "score": 15000}'
   
   # Player 2
   curl -X POST http://localhost:3000/api/v1/scores \
     -H "Content-Type: application/json" \
     -d '{"playerId": "player_002", "score": 12000}'
   
   # Player 3
   curl -X POST http://localhost:3000/api/v1/scores \
     -H "Content-Type: application/json" \
     -d '{"playerId": "player_003", "score": 18000}'
   ```

2. **Get Leaderboard:**
   ```bash
   curl "http://localhost:3000/api/v1/leaderboard?timeframe=alltime&limit=10"
   ```

3. **Get Player Rank:**
   ```bash
   curl "http://localhost:3000/api/v1/leaderboard/player?playerId=player_001&timeframe=alltime"
   ```

4. **Test Rate Limiting:**
   - Use Postman's "Collection Runner"
   - Or run bash script multiple times

---

## 🔧 Postman Pro Tips

### 1. Environment Variables
Create an environment with these variables:
```
base_url = http://localhost:3000/api/v1
player_id = player_001
test_score = 15000
```

### 2. Collection Runner
1. Click "Run" button on collection
2. Select all requests
3. Click "Run Leaderboard System"
4. View results

### 3. Pre-request Scripts
Add to collection:
```javascript
pm.environment.set("timestamp", new Date().toISOString());
```

### 4. Tests Tab
Add automated assertions:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
});
```

---

## 🧪 Test Scenarios

### Scenario 1: Basic Flow
1. Submit score for 3 players
2. Get all-time leaderboard
3. Verify rankings
4. Get individual player rank

### Scenario 2: Timeframes
1. Submit scores
2. Test daily leaderboard
3. Test weekly leaderboard
4. Test monthly leaderboard
5. Test all-time leaderboard

### Scenario 3: Validation
1. Test negative score (should fail)
2. Test score over limit (should fail)
3. Test missing playerId (should fail)
4. Test invalid timeframe (should fail)

### Scenario 4: Rate Limiting
1. Submit 10 scores quickly (should succeed)
2. Submit 11th score (should fail with 429)
3. Wait 60 seconds
4. Submit again (should succeed)

### Scenario 5: Web3 Authentication
1. Request nonce for wallet
2. Sign message with MetaMask/Web3 wallet
3. Verify signature
4. Use authenticated session

---

## 📊 Expected Response Examples

### Submit Score (201 Created)
```json
{
  "statusCode": 201,
  "data": {
    "playerId": "player_001",
    "submittedScore": 15000,
    "totalScore": 15000,
    "rank": 1
  }
}
```

### Get Leaderboard (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "playerId": "player_003",
        "totalScore": 18000,
        "rank": 1
      },
      {
        "playerId": "player_001",
        "totalScore": 15000,
        "rank": 2
      }
    ],
    "total": 10,
    "limit": 10,
    "offset": 0
  }
}
```

### Get Player Rank (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "player": {
      "playerId": "player_001",
      "totalScore": 15000,
      "rank": 2
    },
    "surrounding": {
      "above": [
        {
          "playerId": "player_003",
          "totalScore": 18000,
          "rank": 1
        }
      ],
      "below": [
        {
          "playerId": "player_002",
          "totalScore": 12000,
          "rank": 3
        }
      ]
    }
  }
}
```

### Rate Limit Error (429 Too Many Requests)
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## 🐛 Troubleshooting

### Issue: Connection Refused
**Solution:** Make sure the application is running
```bash
npm run start:dev
```

### Issue: Database Error
**Solution:** Check Docker services
```bash
docker-compose ps
docker-compose up -d
```

### Issue: Rate Limit Errors
**Solution:** Wait 60 seconds or use different playerId

### Issue: Invalid Response Format
**Solution:** Check if migrations are run
```bash
npm run migration:run
```

---

## 📝 Notes

- **Base URL**: `http://localhost:3000/api/v1`
- **Rate Limit**: 10 requests per minute per player
- **Max Score**: 1,000,000 (configurable)
- **Timeframes**: daily, weekly, monthly, alltime
- **Default Limit**: 100 (max: 1000)

---

## 🎯 Next Steps

1. ✅ Import Postman collection
2. ✅ Test basic endpoints
3. ✅ Try different timeframes
4. ✅ Test validation rules
5. ✅ Test rate limiting
6. ✅ Explore Web3 authentication

Happy Testing! 🚀

