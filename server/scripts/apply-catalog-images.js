import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sets Product.imageUrl from prisma/catalog-images/ WITHOUT reseeding.
// Safe to run on production: it only copies image files into uploads/catalog/
// and fills imageUrl on products matched by SKU. Nothing is deleted, no other
// field is touched, and products whose imageUrl is already set (e.g. replaced
// through the admin panel) are left alone.

const prisma = new PrismaClient();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRISMA_DIR = path.join(HERE, '..', 'prisma');
const IMAGES_DIR = path.join(PRISMA_DIR, 'catalog-images');
const UPLOAD_CATALOG_DIR = path.resolve(HERE, '..', 'uploads', 'catalog');

async function main() {
  const { products } = JSON.parse(readFileSync(path.join(PRISMA_DIR, 'catalog-data.json'), 'utf8'));
  mkdirSync(UPLOAD_CATALOG_DIR, { recursive: true });

  let set = 0, kept = 0, missing = 0;
  for (const p of products) {
    if (!p.image) continue;
    const src = path.join(IMAGES_DIR, p.image);
    if (!existsSync(src)) {
      console.warn(`[images] missing file for ${p.sku}: ${p.image}`);
      missing++;
      continue;
    }
    copyFileSync(src, path.join(UPLOAD_CATALOG_DIR, p.image));

    const row = await prisma.product.findUnique({ where: { sku: p.sku }, select: { id: true, imageUrl: true } });
    if (!row) {
      console.warn(`[images] no product with sku ${p.sku} in DB — skipped`);
      missing++;
      continue;
    }
    if (row.imageUrl) {
      kept++; // admin already picked an image; don't overwrite
      continue;
    }
    await prisma.product.update({ where: { id: row.id }, data: { imageUrl: `/uploads/catalog/${p.image}` } });
    set++;
  }
  console.log(`[images] OK · set=${set} · kept existing=${kept} · missing/skipped=${missing}`);
}

main()
  .catch((e) => { console.error('[images] failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
