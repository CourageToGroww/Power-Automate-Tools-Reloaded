import { ServiceModule, UrlPattern } from './ServiceModule.interface';

class ModuleRegistryImpl {
  private modules: Map<string, ServiceModule> = new Map();

  register(module: ServiceModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`[ModuleRegistry] Module "${module.id}" already registered, overwriting`);
    }
    this.modules.set(module.id, module);
  }

  get(id: string): ServiceModule | undefined {
    return this.modules.get(id);
  }

  getAll(): ServiceModule[] {
    return Array.from(this.modules.values()).sort(
      (a, b) => a.navOrder - b.navOrder
    );
  }

  /** Get all URL patterns across all modules, tagged with their service ID */
  getAllUrlPatterns(): Array<UrlPattern & { serviceId: string }> {
    const patterns: Array<UrlPattern & { serviceId: string }> = [];
    for (const mod of this.modules.values()) {
      for (const p of mod.urlPatterns) {
        patterns.push({ ...p, serviceId: mod.id });
      }
    }
    return patterns;
  }

  /** Get raw URL pattern strings for webRequest listener */
  getAllUrlPatternStrings(): string[] {
    const strings: string[] = [];
    for (const mod of this.modules.values()) {
      for (const p of mod.urlPatterns) {
        strings.push(p.pattern);
      }
    }
    return strings;
  }

  /** Get all host permissions needed by all registered modules */
  getAllHostPermissions(): string[] {
    const perms = new Set<string>();
    for (const mod of this.modules.values()) {
      for (const hp of mod.hostPermissions) {
        perms.add(hp);
      }
    }
    return Array.from(perms);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  get size(): number {
    return this.modules.size;
  }
}

/** Singleton module registry */
export const ModuleRegistry = new ModuleRegistryImpl();
