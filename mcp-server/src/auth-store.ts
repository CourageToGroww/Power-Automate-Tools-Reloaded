// ServiceType matches the extension's enum
export type ServiceType = 'power-automate' | 'sharepoint' | 'intune' | 'forms' | 'graph' | 'teams' | 'unknown';

export interface StoredCredential {
  service: ServiceType;
  token: string;
  apiUrl: string;
  context: Record<string, any>;
  updatedAt: number;
}

class AuthStore {
  private credentials = new Map<ServiceType, StoredCredential>();

  set(service: ServiceType, token: string, apiUrl: string, context: Record<string, any>): void {
    this.credentials.set(service, { service, token, apiUrl, context, updatedAt: Date.now() });
  }

  get(service: ServiceType): StoredCredential | undefined {
    return this.credentials.get(service);
  }

  getToken(service: ServiceType): string | undefined {
    return this.credentials.get(service)?.token;
  }

  getAll(): StoredCredential[] {
    return Array.from(this.credentials.values());
  }

  getStatus(): Record<string, { hasToken: boolean; updatedAt: number }> {
    const result: Record<string, { hasToken: boolean; updatedAt: number }> = {};
    for (const [svc, cred] of this.credentials) {
      result[svc] = { hasToken: true, updatedAt: cred.updatedAt };
    }
    return result;
  }

  clear(): void {
    this.credentials.clear();
  }
}

export const authStore = new AuthStore();
