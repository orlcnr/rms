import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createHash } from 'crypto';

@Injectable()
export class EffectiveMenuCacheService {
  private readonly ttlSeconds = 120;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  private getBrandVersionKey(brandId: string): string {
    return `brand:${brandId}:effectiveMenu:version`;
  }

  private getBranchVersionKey(branchId: string): string {
    return `branch:${branchId}:effectiveMenu:version`;
  }

  private async getVersion(key: string): Promise<number> {
    const value = await this.cacheManager.get<number | string>(key);
    if (!value) {
      await this.cacheManager.set(key, 1, this.ttlSeconds * 24);
      return 1;
    }
    return Number(value) || 1;
  }

  async getCacheKey(
    brandId: string,
    branchId: string,
    query: unknown,
  ): Promise<string> {
    const [brandVersion, branchVersion] = await Promise.all([
      this.getVersion(this.getBrandVersionKey(brandId)),
      this.getVersion(this.getBranchVersionKey(branchId)),
    ]);

    const hash = createHash('sha1').update(JSON.stringify(query)).digest('hex');
    return `branch:${branchId}:brandv:${brandVersion}:branchv:${branchVersion}:effectiveMenu:${hash}`;
  }

  async getCategoryVisibilityStatsCacheKey(
    branchId: string,
    brandId: string,
  ): Promise<string> {
    const brandVersion = await this.getVersion(
      this.getBrandVersionKey(brandId),
    );
    const branchVersion = await this.getVersion(
      this.getBranchVersionKey(branchId),
    );
    return `branch:${branchId}:brandv:${brandVersion}:branchv:${branchVersion}:categoryVisibilityStats`;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.cacheManager.set(key, value, this.ttlSeconds);
  }

  async invalidateBranch(branchId: string): Promise<void> {
    const key = this.getBranchVersionKey(branchId);
    const current = await this.getVersion(key);
    await this.cacheManager.set(key, current + 1, this.ttlSeconds * 24);
  }

  async invalidateBrand(brandId: string): Promise<void> {
    const key = this.getBrandVersionKey(brandId);
    const current = await this.getVersion(key);
    await this.cacheManager.set(key, current + 1, this.ttlSeconds * 24);
  }
}
