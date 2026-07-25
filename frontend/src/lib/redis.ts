import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Create new Redis client
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis connection failed after 10 retries');
          return new Error('Redis connection failed');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  await redisClient.connect();
  return redisClient;
}

export async function setSession(
  userId: string,
  roomName: string,
  sessionId: string,
  role: string = 'guest', // 'host', 'guest', or 'observer'
  ttlSeconds: number = 300 // 5 minutes default
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}:${roomName}:${role}`;
    await client.set(key, sessionId, { EX: ttlSeconds });
    return true;
  } catch (error) {
    console.error('Error setting Redis session:', error);
    return false;
  }
}

export async function getSession(
  userId: string,
  roomName: string,
  role: string = 'guest'
): Promise<string | null> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}:${roomName}:${role}`;
    const sessionId = await client.get(key);
    return sessionId;
  } catch (error) {
    console.error('Error getting Redis session:', error);
    return null;
  }
}

export async function deleteSession(
  userId: string,
  roomName: string,
  role: string = 'guest'
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}:${roomName}:${role}`;
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting Redis session:', error);
    return false;
  }
}

export async function checkAndSetSession(
  userId: string,
  roomName: string,
  newSessionId: string,
  role: string = 'guest',
  ttlSeconds: number = 300
): Promise<{ allowed: boolean; existingSessionId?: string }> {
  try {
    const existingSessionId = await getSession(userId, roomName, role);
    
    if (existingSessionId) {
      // Session already exists for this role
      return { allowed: false, existingSessionId };
    }
    
    // No existing session for this role, create new one
    const success = await setSession(userId, roomName, newSessionId, role, ttlSeconds);
    return { allowed: success };
  } catch (error) {
    console.error('Error checking/setting session:', error);
    return { allowed: false };
  }
}

export async function updateSessionTTL(
  userId: string,
  roomName: string,
  role: string = 'guest',
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}:${roomName}:${role}`;
    const sessionId = await client.get(key);
    
    if (sessionId) {
      await client.expire(key, ttlSeconds);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating session TTL:', error);
    return false;
  }
}
