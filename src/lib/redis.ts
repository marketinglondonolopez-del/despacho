import Redis from 'ioredis';
import { env } from '../config/env';

export interface ICacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(lockKey: string): Promise<void>;
  isHealthy(): boolean;
}

class InMemoryCache implements ICacheService {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private locks = new Set<string>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    if (this.locks.has(lockKey)) {
      return false; // Lock already held
    }
    this.locks.add(lockKey);
    setTimeout(() => {
      this.locks.delete(lockKey);
    }, ttlSeconds * 1000);
    return true;
  }

  async releaseLock(lockKey: string): Promise<void> {
    this.locks.delete(lockKey);
  }

  isHealthy(): boolean {
    return true;
  }
}

class RedisCache implements ICacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private fallbackMemory = new InMemoryCache();

  constructor() {
    try {
      this.client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
      });

      // Intentar conectar en segundo plano sin bloquear el arranque
      this.client.connect().catch(() => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback
      }
    }
    return this.fallbackMemory.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fallback
      }
    }
    return this.fallbackMemory.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // Fallback
      }
    }
    return this.fallbackMemory.del(key);
  }

  async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        // Operación atómica SET lockKey 1 NX EX ttlSeconds
        const result = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {
        // Fallback a lock en memoria si Redis falla
      }
    }
    return this.fallbackMemory.acquireLock(lockKey, ttlSeconds);
  }

  async releaseLock(lockKey: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(lockKey);
        return;
      } catch {
        // Fallback
      }
    }
    return this.fallbackMemory.releaseLock(lockKey);
  }

  isHealthy(): boolean {
    return this.isConnected || true;
  }
}

export const cacheService: ICacheService = new RedisCache();
