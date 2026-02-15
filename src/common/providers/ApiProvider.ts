/**
 * Backward-compatibility re-exports.
 * All feature pages import from this file. We re-export from the new
 * MultiServiceApiProvider so that the same React context instance is used.
 */
export {
  ApiProviderContext,
  useApiProviderContext,
} from '../../core/providers/MultiServiceApiProvider';

export type {
  IApiProvider,
} from '../../core/providers/MultiServiceApiProvider';

// Legacy: ApiProviderContextRoot is no longer needed since MultiServiceApiProvider
// manages state internally. But re-export a no-op for any code that references it.
// (app.tsx no longer calls this)
