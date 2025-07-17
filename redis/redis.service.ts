import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import { SettingsService } from 'modules/settings/settings.service';

@Injectable()
export class RedisService {
  redis: Redis;
  public constructor(private readonly settingService: SettingsService) {
    this.init();
  }

  public async setWithExpiry(key: string, value: string | object, ttlSeconds: number): Promise<void> {
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.set(key, serializedValue, 'EX', ttlSeconds);
  }

  public async addToList(key: string, value: string): Promise<void> {
    await this.redis.rpush(key, value);
  }

  public async getList(key: string): Promise<string[]> {
    return this.redis.lrange(key, 0, -1);
  }

  public async set(key: string, value: object | string | number | null, ttlInSeconds?: number): Promise<void> {
    if (ttlInSeconds) {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlInSeconds);
      return;
    }
    await this.redis.set(key, JSON.stringify(value));
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  private init(): void {
    const url = this.settingService.getSettings().redis.url;
    this.redis = new Redis(url);
  }
}
