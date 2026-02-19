export interface DataSource {
  id: string;
  serviceType: string;
  context: Record<string, string>;
  label: string;
  sourceUrl: string;
  originTabId?: number;
  capturedAt: number;
}

export interface DataSourceGroup {
  serviceType: string;
  label: string;
  icon: string;
  sources: DataSource[];
}

/**
 * Generates a deduplication key for a data source based on service type and context values.
 * Sources with the same key are considered duplicates (e.g. same SP site, same PA flow).
 */
export function getSourceDeduplicationKey(source: DataSource): string {
  const contextKeys = Object.keys(source.context).sort();
  const contextValues = contextKeys.map((k) => source.context[k]);
  return [source.serviceType, ...contextValues].join(':');
}
