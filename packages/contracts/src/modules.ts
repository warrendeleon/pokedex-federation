// --- Module IDs. Each federated remote has one. Used as the key in cross-module action types,
// bridge envelope `moduleId` fields, and the route registry. Adding a module is a one-row change
// here; this file is what every other module imports from to avoid hardcoded strings. ---

export const MODULES = {
  list: 'list',
  party: 'party',
  regions: 'regions',
  detail: 'detail',
} as const;

export type ModuleId = (typeof MODULES)[keyof typeof MODULES];
