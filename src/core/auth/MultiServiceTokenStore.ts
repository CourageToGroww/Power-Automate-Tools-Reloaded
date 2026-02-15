import { ServiceCredentials } from '../modules/ServiceModule.interface';

/**
 * In-memory token store keyed by serviceId.
 * Replaces the old single-slot state.token / state.lastMatchedRequest.
 */
class MultiServiceTokenStoreImpl {
  private credentials: Map<string, ServiceCredentials> = new Map();

  store(serviceId: string, creds: ServiceCredentials): void {
    this.credentials.set(serviceId, creds);
  }

  get(serviceId: string): ServiceCredentials | undefined {
    return this.credentials.get(serviceId);
  }

  getToken(serviceId: string): string | undefined {
    return this.credentials.get(serviceId)?.token;
  }

  isExpired(serviceId: string): boolean {
    const creds = this.credentials.get(serviceId);
    if (!creds?.expiresAt) return true;
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    return Date.now() > creds.expiresAt.getTime() - bufferMs;
  }

  has(serviceId: string): boolean {
    return this.credentials.has(serviceId);
  }

  /** Remove credentials for a service */
  clear(serviceId: string): void {
    this.credentials.delete(serviceId);
  }

  /** Get all service IDs that have valid (non-expired) credentials */
  getAuthenticatedServices(): string[] {
    return Array.from(this.credentials.keys()).filter(
      (id) => !this.isExpired(id)
    );
  }

  /** Get all stored credentials */
  getAll(): Map<string, ServiceCredentials> {
    return new Map(this.credentials);
  }
}

export const MultiServiceTokenStore = new MultiServiceTokenStoreImpl();
