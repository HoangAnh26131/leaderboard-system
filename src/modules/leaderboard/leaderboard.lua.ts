/**
 * Lua scripts for atomic Redis operations
 * These scripts ensure race-condition-free updates to the leaderboard
 */

/**
 * Atomic score update script
 * Updates player's total score and leaderboard position atomically
 *
 * KEYS[1] = player score hash key (e.g., "player:score:player_123")
 * KEYS[2] = leaderboard sorted set key (e.g., "leaderboard:alltime")
 * ARGV[1] = playerId
 * ARGV[2] = score to add
 * ARGV[3] = max leaderboard size
 *
 * Returns: [newTotalScore, rank]
 */
export const ATOMIC_SCORE_UPDATE = `
  local playerKey = KEYS[1]
  local leaderboardKey = KEYS[2]
  local playerId = ARGV[1]
  local scoreToAdd = tonumber(ARGV[2])
  local maxSize = tonumber(ARGV[3])

  -- Atomically increment player's total score
  local newTotal = redis.call('HINCRBY', playerKey, playerId, scoreToAdd)

  -- Check if player should be in leaderboard
  local currentScore = redis.call('ZSCORE', leaderboardKey, playerId)
  local currentSize = redis.call('ZCARD', leaderboardKey)

  local shouldUpdate = false

  if currentScore ~= false then
    -- Player already in leaderboard, always update
    shouldUpdate = true
  elseif currentSize < maxSize then
    -- Leaderboard not full, add player
    shouldUpdate = true
  else
    -- Check if player's score beats minimum in leaderboard
    local minScore = redis.call('ZRANGE', leaderboardKey, 0, 0, 'WITHSCORES')
    if #minScore == 0 or newTotal > tonumber(minScore[2]) then
      shouldUpdate = true
    end
  end

  local rank = -1

  if shouldUpdate then
    -- Update leaderboard atomically
    redis.call('ZADD', leaderboardKey, newTotal, playerId)
    rank = redis.call('ZREVRANK', leaderboardKey, playerId)

    -- Trim if needed (keep only top maxSize * 1.1 for buffer)
    local trimThreshold = math.floor(maxSize * 1.1)
    local size = redis.call('ZCARD', leaderboardKey)
    if size > trimThreshold then
      redis.call('ZREMRANGEBYRANK', leaderboardKey, 0, size - maxSize - 1)
    end
  end

  return {newTotal, rank + 1}
`;

/**
 * Atomic rank retrieval script
 * Gets player rank with guaranteed consistency
 *
 * KEYS[1] = leaderboard sorted set key
 * ARGV[1] = playerId
 *
 * Returns: [rank, score] or [-1, 0] if not found
 */
export const ATOMIC_GET_RANK = `
  local leaderboardKey = KEYS[1]
  local playerId = ARGV[1]

  local rank = redis.call('ZREVRANK', leaderboardKey, playerId)
  local score = redis.call('ZSCORE', leaderboardKey, playerId)

  if rank == false then
    return {-1, 0}
  end

  return {rank + 1, tonumber(score)}
`;

/**
 * Atomic leaderboard page retrieval
 * Gets a page of the leaderboard with scores and ranks
 *
 * KEYS[1] = leaderboard sorted set key
 * ARGV[1] = start index
 * ARGV[2] = end index
 *
 * Returns: array of [playerId, score, rank]
 */
export const ATOMIC_GET_LEADERBOARD_PAGE = `
  local leaderboardKey = KEYS[1]
  local startIdx = tonumber(ARGV[1])
  local endIdx = tonumber(ARGV[2])

  local members = redis.call('ZREVRANGE', leaderboardKey, startIdx, endIdx, 'WITHSCORES')
  local result = {}

  for i = 1, #members, 2 do
    local playerId = members[i]
    local score = members[i + 1]
    local rank = startIdx + math.floor(i / 2) + 1
    table.insert(result, {playerId, tonumber(score), rank})
  end

  return result
`;

/**
 * Atomic surrounding players retrieval
 * Gets players above and below a given player
 *
 * KEYS[1] = leaderboard sorted set key
 * ARGV[1] = playerId
 * ARGV[2] = count (number of players above and below)
 *
 * Returns: {above: [...], player: {...}, below: [...]}
 */
export const ATOMIC_GET_SURROUNDING = `
  local leaderboardKey = KEYS[1]
  local playerId = ARGV[1]
  local count = tonumber(ARGV[2])

  local rank = redis.call('ZREVRANK', leaderboardKey, playerId)

  if rank == false then
    return {0, {}, {}, {}}
  end

  local score = redis.call('ZSCORE', leaderboardKey, playerId)
  local playerRank = rank + 1

  -- Get players above (higher rank = lower index)
  local aboveStart = math.max(0, rank - count)
  local aboveEnd = rank - 1
  local above = {}

  if aboveEnd >= aboveStart then
    local aboveMembers = redis.call('ZREVRANGE', leaderboardKey, aboveStart, aboveEnd, 'WITHSCORES')
    for i = 1, #aboveMembers, 2 do
      table.insert(above, {aboveMembers[i], tonumber(aboveMembers[i + 1]), aboveStart + math.floor(i / 2) + 1})
    end
  end

  -- Get players below (lower rank = higher index)
  local belowStart = rank + 1
  local belowEnd = rank + count
  local below = {}

  local belowMembers = redis.call('ZREVRANGE', leaderboardKey, belowStart, belowEnd, 'WITHSCORES')
  for i = 1, #belowMembers, 2 do
    table.insert(below, {belowMembers[i], tonumber(belowMembers[i + 1]), belowStart + math.floor(i / 2) + 1})
  end

  return {playerRank, tonumber(score), above, below}
`;
