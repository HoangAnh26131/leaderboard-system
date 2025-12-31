# Senior Backend Engineer - Coding Task

## Overview
Build a **Real-time Multiplayer Game Leaderboard System** using **NestJS**. The system must handle high traffic, support multiple game modes, and provide sub-second latency for leaderboard operations.

## Core Features

### 1. Score Submission API
**Request**:
```json
{
  "playerId": "player_123",
  "score": 15000,
  "metadata": { "level": 5, "timeSpent": 120 },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Requirements**:
- Validate score (non-negative, reasonable bounds)
- Rate limiting: max 10 submissions/minute per player
- Return current rank after submission

### 2. Leaderboard Retrieval API
**Query Params**: `timeframe` (daily|weekly|monthly|alltime), `limit` (default: 100, max: 1000), `offset`, `playerId` (optional)

**Response**: Returns ranked list with pagination

### 3. Player Rank API
**Query Params**: `timeframe`

**Response**: Player rank, score, and surrounding players (2 above, 2 below)

## Technical Requirements

### Architecture
- **NestJS** microservices architecture (separate modules for score submission and retrieval)
- **Redis** (Sorted Sets) for real-time leaderboard
- **MySQL** for persistent storage
- Eventual consistency between Redis and MySQL
- Handle race conditions and concurrent updates

### Performance
Target performance goals:
- Score submission: < 50ms p95 latency (with async MySQL writes)
- Leaderboard retrieval: < 100ms p95 latency
- Support 10K+ score updates/second
- Redis memory optimization

### Validation & Security
- Score validation (detect impossible jumps)
- Rate limiting per player
- Log suspicious activities

### Testing (Required)

> **Note**: E2E tests are the primary way we evaluate your code results and performance. They are essential for verification.

- **E2E Tests (MANDATORY)**: Runnable end-to-end tests that:
  - Test complete flows (submit → retrieve → rank check)
  - Use test containers or Docker images for MySQL + Redis (portable, runnable in any accessible environment)
  - Executable with single command (`npm run test:e2e` or else)
  - Cover all APIs, timeframes, rate limiting, and validation
  - **Include reasonable concurrent test scenarios** (e.g., multiple players submitting scores simultaneously, concurrent leaderboard reads)
  - Must be runnable in any of accessible environment (local, CI/CD, remote, etc.)
- Unit tests (Jest + `@nestjs/testing`)
- Integration tests (Supertest)
- >80% code coverage

## Technology Stack

**Required**:
- **NestJS**, TypeScript (strict mode)
- MySQL, Redis
- TypeORM
- ioredis or @nestjs/redis

## Deliverables

1. **Source Code**: Production-ready NestJS app with proper module organization, DTOs, error handling, TypeScript strict mode (no `any`)

2. **Database**: MySQL schema with migrations, indexing strategy, Redis data structure design

3. **Documentation**: Architecture diagram, API docs, setup instructions, performance considerations

4. **Testing**: Runnable e2e tests (portable, runnable in any accessible environment), unit tests, integration tests, coverage report, clear test execution instructions

## Evaluation Criteria

- **Code Quality**: NestJS best practices, error handling, TypeScript strict mode, SOLID principles
- **Architecture**: Scalability, microservices design, database optimization, caching
- **Performance**: Query optimization, Redis efficiency, response times
- **Completeness**: All features implemented, e2e tests, documentation
- **Best Practices**: Security, rate limiting, logging, testing

## Bonus: Web3 Addon Test (Optional)

> **Note**: This is an optional bonus section to demonstrate basic web3/blockchain knowledge.

### Requirements

Add **Web3 wallet authentication** to the leaderboard system:

1. **Wallet Authentication**
   - Add endpoint to authenticate players using wallet signatures (EIP-191)
   - Store wallet addresses linked to player accounts
   - Implement simple nonce-based authentication

2. **Basic Integration**
   - Use `ethers.js` for signature verification
   - Add wallet address to player profile
   - Optional: Display wallet address in leaderboard response

### Deliverables

1. **API Endpoints**: 
   - `POST /auth/wallet/request` - Request nonce for signing
   - `POST /auth/wallet/verify` - Verify signature and authenticate
2. **Backend Module**: NestJS module for wallet signature verification
3. **Tests**: Basic E2E tests for authentication flow

### Evaluation Criteria

- Correct signature verification implementation
- Proper nonce management
- Clean code integration with existing system

## Submission

1. GitHub repo with `README.md` including:
   - Setup and run instructions
   - **E2E test execution steps** (must be clearly documented - tests should be runnable in any accessible environment)
   - API examples, architecture overview
2. E2E tests must be runnable with a single command in any accessible environment
3. Production-ready code (not prototype)

---
