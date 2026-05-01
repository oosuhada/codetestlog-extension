/**
 * CodeTestLog site adapter registry.
 *
 * Adding a new judge site:
 * 1. Create `scripts/{siteKey}/adapter.js`.
 * 2. Register it with `SiteAdapterRegistry.register(siteKey, adapter)`.
 * 3. Implement `isActive()` and `detect()`.
 * 4. Add the domain and scripts to `manifest.json`.
 *
 * Adapter contract:
 * - `isActive(): boolean`
 * - `detect(): Promise<SubmissionResult|null>`
 *
 * SubmissionResult fields:
 * - `problemId`: stable problem id
 * - `title`: problem title
 * - `level`: level/tier, for example `lv2`, `silver`, `d3`, `medium`
 * - `result`: CTL result, for example `correct`, `wrong`, `timeout`
 * - `code`: submitted source code
 * - `language`: language label
 * - `siteLabel`: top-level GitHub folder label, for example `백준`
 * - `siteKey`: storage namespace key, for example `baekjoon`
 * - optional `readme`, `commitPath`, `fileName`, `message`, `submissionId`
 */
var SiteAdapterRegistry = globalThis.SiteAdapterRegistry || (() => {
  const adapters = {};

  return {
    register(siteKey, adapter) {
      if (!siteKey || !adapter) return;
      adapters[siteKey] = adapter;
      console.log(`[CTL] Adapter registered: ${siteKey}`);
    },
    get(siteKey) {
      return adapters[siteKey] || null;
    },
    getAll() {
      return Object.entries(adapters);
    },
    getActive() {
      return Object.entries(adapters).find(([, adapter]) => {
        try {
          return adapter && typeof adapter.isActive === 'function' && adapter.isActive();
        } catch (_) {
          return false;
        }
      }) || null;
    },
  };
})();

globalThis.SiteAdapterRegistry = SiteAdapterRegistry;
