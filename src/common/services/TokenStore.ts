import { ServiceType, ServiceContext } from './ServiceDetector';

export interface StoredToken {
  token: string;
  apiUrl: string;
  context: ServiceContext;
  capturedAt: number;
  expiresAt?: number;
}

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'm365_tokens';

export class TokenStore {
  private tokens: Map<ServiceType, StoredToken> = new Map();
  private loadPromise: Promise<void>;

  constructor() {
    // Eagerly load from storage on construction
    this.loadPromise = this.loadFromStorage();
  }

  /** Wait for storage to be loaded. Call before reading tokens after service worker restart. */
  async waitForLoad(): Promise<void> {
    return this.loadPromise;
  }

  private loadFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          if (chrome.runtime.lastError) {
            resolve();
            return;
          }
          const stored = result[STORAGE_KEY];
          if (stored && typeof stored === 'object') {
            for (const [key, value] of Object.entries(stored)) {
              this.tokens.set(key as ServiceType, value as StoredToken);
            }
          }
          resolve();
        });
      } catch {
        // storage may not be available in all contexts
        resolve();
      }
    });
  }

  private persistToStorage(): void {
    try {
      const obj: Record<string, StoredToken> = {};
      for (const [service, stored] of this.tokens) {
        obj[service] = stored;
      }
      chrome.storage.local.set({ [STORAGE_KEY]: obj });
    } catch {
      // storage may not be available
    }
  }

  setToken(service: ServiceType, token: string, apiUrl: string, context: ServiceContext): void {
    let expiresAt: number | undefined;
    try {
      const payload = this.decodeJwtPayload(token);
      if (payload?.exp) {
        expiresAt = payload.exp * 1000;
      }
    } catch {
      // Token may not be JWT; store without expiry
    }

    this.tokens.set(service, {
      token,
      apiUrl,
      context,
      capturedAt: Date.now(),
      expiresAt,
    });

    this.persistToStorage();
  }

  getToken(service: ServiceType): StoredToken | undefined {
    return this.tokens.get(service);
  }

  isExpired(service: ServiceType): boolean {
    const stored = this.tokens.get(service);
    if (!stored?.expiresAt) return false;
    return Date.now() > (stored.expiresAt - TOKEN_EXPIRY_BUFFER_MS);
  }

  hasValidToken(service: ServiceType): boolean {
    const stored = this.tokens.get(service);
    if (!stored) return false;
    return !this.isExpired(service);
  }

  getAllServices(): ServiceType[] {
    return Array.from(this.tokens.keys());
  }

  getStatus(): Record<ServiceType, { hasToken: boolean; expired: boolean }> {
    const result: Record<string, { hasToken: boolean; expired: boolean }> = {};
    for (const [service, stored] of this.tokens) {
      result[service] = {
        hasToken: Boolean(stored.token),
        expired: this.isExpired(service),
      };
    }
    return result as Record<ServiceType, { hasToken: boolean; expired: boolean }>;
  }

  /** Export all credentials for sending to relay */
  exportCredentials(): Array<{
    service: ServiceType;
    token: string;
    apiUrl: string;
    context: ServiceContext;
  }> {
    const result: Array<{
      service: ServiceType;
      token: string;
      apiUrl: string;
      context: ServiceContext;
    }> = [];
    for (const [service, stored] of this.tokens) {
      result.push({
        service,
        token: stored.token,
        apiUrl: stored.apiUrl,
        context: stored.context,
      });
    }
    return result;
  }

  private decodeJwtPayload(token: string): any {
    const bearerStripped = token.startsWith('Bearer ')
      ? token.slice(7)
      : token;
    const parts = bearerStripped.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  }
}
