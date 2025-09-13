// Simple client-side cache to reduce API calls
class ClientCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMinutes: number = 10): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create global cache instance
export const clientCache = new ClientCache();

// Cache keys for different types of data
export const CACHE_KEYS = {
  BLUEPRINT_VARIANTS: 'blueprint_6_variants',
  PRODUCT_DETAILS: (productId: string) => `product_${productId}`,
  CATALOG_DATA: (path: string) => `catalog_${path}`
};