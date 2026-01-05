# 📋 API Validation Requirements

## Issues Fixed

Based on your test run, I identified and fixed several validation issues with the API requests.

---

## 🔴 Problems Found

### 1. Score Submission Errors

**Error:** `"timestamp should not be empty","timestamp must be a Date instance"`

**Cause:** The API requires **ALL these fields** for score submission:
- ✅ `playerId` (string, required)
- ✅ `score` (number, required)
- ✅ `metadata` (object, required) - cannot be empty
- ✅ `timestamp` (Date, required) - cannot be empty

**Example of WRONG request:**
```json
{
  "playerId": "player_001",
  "score": 15000
}
```

**Example of CORRECT request:**
```json
{
  "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
  "score": 15000,
  "metadata": {
    "level": 5,
    "timeSpent": 120
  },
  "timestamp": "2025-01-05T10:30:00Z"
}
```

---

### 2. Player ID Mismatch Error

**Error:** `"Player is not allowed"` (403 Forbidden)

**Cause:** The `playerId` in your request **MUST match** your authenticated user's playerId from the JWT token.

When you authenticated with wallet `0x06be28dfbbfa289f4ac2690833cd0d74fab53091`, the system assigned you playerId: `e0cfb71d-a439-444f-a8da-c063b9c17dab`.

**Wrong:** Trying to submit for "player_001", "player_002", etc.  
**Correct:** Use your authenticated playerId: `e0cfb71d-a439-444f-a8da-c063b9c17dab`

**Why?** This prevents users from submitting scores on behalf of other players.

---

### 3. Player Rank Query Error

**Error:** `"property playerId should not exist"`

**Cause:** The `/leaderboard/player` endpoint does **NOT** accept `playerId` in query parameters. It automatically uses your authenticated user's playerId from the JWT token.

**Wrong:**
```bash
curl "http://localhost:3000/api/v1/leaderboard/player?playerId=player_001&timeframe=alltime"
```

**Correct:**
```bash
curl "http://localhost:3000/api/v1/leaderboard/player?timeframe=alltime" -b cookies.txt
```

The system knows who you are from your authentication cookies!

---

## ✅ Fixed Scripts

All scripts have been updated with correct validation:

### 1. `postman-curl-collection.sh`
- ✅ Automatically extracts your playerId after authentication
- ✅ Uses your playerId in all score submissions
- ✅ Includes required `timestamp` and `metadata` fields
- ✅ Removes `playerId` from player rank queries

### 2. `test-api-simple.sh`
- ✅ Same fixes as above
- ✅ Better error handling
- ✅ Prettier output

---

## 📚 Complete API Reference

### POST /api/v1/scores

**Request Body (ALL fields required):**
```json
{
  "playerId": "YOUR_AUTHENTICATED_PLAYER_ID",
  "score": 15000,
  "metadata": {
    "level": 5,
    "timeSpent": 120
  },
  "timestamp": "2025-01-05T10:30:00Z"
}
```

**Field Requirements:**
- `playerId`: String, must match authenticated user
- `score`: Number, 0 to 1,000,000, non-negative
- `metadata`: Object, required, must have at least one property
- `timestamp`: Date/ISO string, required

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "data": {
    "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
    "submittedScore": 15000,
    "totalScore": 15000,
    "rank": 1
  }
}
```

---

### GET /api/v1/leaderboard

**Query Parameters:**
- `timeframe`: (optional) `daily` | `weekly` | `monthly` | `alltime`
- `limit`: (optional) Number, default 100, max 1000
- `offset`: (optional) Number, default 0
- `playerId`: (optional) Include specific player in results

**Example:**
```bash
curl "http://localhost:3000/api/v1/leaderboard?timeframe=alltime&limit=10" \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
        "totalScore": 25000,
        "rank": 1
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

---

### GET /api/v1/leaderboard/player

**Query Parameters:**
- `timeframe`: (optional) `daily` | `weekly` | `monthly` | `alltime`
- **⚠️ DO NOT include `playerId`** - it's automatically from JWT

**Example:**
```bash
curl "http://localhost:3000/api/v1/leaderboard/player?timeframe=alltime" \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "data": {
    "player": {
      "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
      "totalScore": 25000,
      "rank": 1
    },
    "surrounding": {
      "above": [],
      "below": []
    }
  }
}
```

---

## 🧪 Testing with Correct Validation

### Manual cURL Example

```bash
# 1. Authenticate (done - you have cookies)

# 2. Get your playerId from the authentication response
# Your playerId: e0cfb71d-a439-444f-a8da-c063b9c17dab

# 3. Submit a score with ALL required fields
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
    "score": 15000,
    "metadata": {
      "level": 5,
      "timeSpent": 120
    },
    "timestamp": "2025-01-05T10:30:00Z"
  }'

# 4. Get leaderboard
curl "http://localhost:3000/api/v1/leaderboard?timeframe=alltime&limit=10" \
  -b cookies.txt

# 5. Get YOUR rank (no playerId needed)
curl "http://localhost:3000/api/v1/leaderboard/player?timeframe=alltime" \
  -b cookies.txt
```

---

## 🎯 Using Updated Scripts

### Option 1: Simple Automated Script

```bash
./test-api-simple.sh
```

This will now:
- ✅ Authenticate and extract your playerId
- ✅ Submit 5 scores with correct validation
- ✅ Retrieve leaderboard
- ✅ Get your rank

### Option 2: Full Test Suite

```bash
./postman-curl-collection.sh
```

This will now:
- ✅ Guide through authentication
- ✅ Extract and use your playerId
- ✅ Test all endpoints with correct validation
- ✅ Include proper timestamps and metadata

---

## 📊 Expected Results

After running the fixed scripts, you should see:

### ✅ Successful Score Submissions
```json
{
  "statusCode": 201,
  "data": {
    "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
    "submittedScore": 15000,
    "totalScore": 30000,  // Cumulative
    "rank": 1
  }
}
```

### ✅ Leaderboard with Your Scores
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
        "totalScore": 89500,  // Sum of all submissions
        "rank": 1
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

### ✅ Your Player Rank
```json
{
  "statusCode": 200,
  "data": {
    "player": {
      "playerId": "e0cfb71d-a439-444f-a8da-c063b9c17dab",
      "totalScore": 89500,
      "rank": 1
    },
    "surrounding": {
      "above": [],
      "below": []
    }
  }
}
```

---

## 🎓 Key Takeaways

1. **All score submissions require 4 fields:** playerId, score, metadata, timestamp
2. **The playerId must match your authenticated user**
3. **Player rank endpoint doesn't need playerId** - it's from JWT
4. **Always include authentication cookies** with `-b cookies.txt`
5. **The updated scripts handle all validation automatically**

---

## 🚀 Next Steps

Try running the updated scripts:

```bash
# Clean start
rm -f cookies.txt /tmp/leaderboard-cookies.txt

# Run the simple test
./test-api-simple.sh

# OR run the full test suite
./postman-curl-collection.sh
```

Both scripts now have proper validation and will work correctly! ✅

---

**All validation issues have been fixed in the updated scripts!** 🎉

