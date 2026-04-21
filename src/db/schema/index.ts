// Barrel re-export of all Drizzle schema modules.
// Consumed by src/db/client.ts and src/db/client-ws.ts via
// `import * as schema from './schema'` so Drizzle's query builder knows
// every table at once.
export * from './auth';
export * from './admin';
export * from './categories';
export * from './manufacturers';
export * from './products';
export * from './spec-fields';
export * from './spec-values';
export * from './search';
export * from './recipes';
export * from './industries';
export * from './contact';
