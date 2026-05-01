// Phase 4 plan 04-01: M:N junction tables for product cross-links.
//
// product_recipes — author-side: a recipe can list multiple products it covers.
// product_industries — author-side: an industry page can list multiple products.
//
// Both tables follow the project-wide Phase-1 conventions:
//   - composite PK on (product_id, <other>_id)
//   - 2 FKs ON DELETE CASCADE (deleting either side removes the junction row)
//   - 2 indices: one on each FK column (forward + reverse query paths)
//   - position int default 0 for ordering within a content row
//   - created_at timestamptz default now() for audit / sort tie-break
//
// Reverse direction renders read-only on the public product detail page as the
// "Used in" section (CONT-04 / D-04 / D-09) — see views/product-used-in.ts.
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { products } from './products';
import { recipes } from './recipes';
import { industries } from './industries';

export const productRecipes = pgTable(
  'product_recipes',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.recipeId] }),
    index('product_recipes_recipe_idx').on(t.recipeId),
    index('product_recipes_product_idx').on(t.productId),
  ],
);

export const productIndustries = pgTable(
  'product_industries',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    industryId: uuid('industry_id')
      .notNull()
      .references(() => industries.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.industryId] }),
    index('product_industries_industry_idx').on(t.industryId),
    index('product_industries_product_idx').on(t.productId),
  ],
);
