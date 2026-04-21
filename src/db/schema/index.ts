// Barrel re-export of all Drizzle schema modules.
// Consumed by src/db/client.ts and src/db/client-ws.ts via
// `import * as schema from './schema'` so Drizzle's query builder knows
// every table at once.
//
// NOTE: Task 02.1 populates 6 modules (auth/admin/categories/manufacturers/
// products/contact). Task 02.2 adds spec-fields, spec-values, search,
// recipes, industries and extends this barrel accordingly.
export * from './auth';
export * from './admin';
export * from './categories';
export * from './manufacturers';
export * from './products';
export * from './contact';
