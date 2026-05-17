import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const prisma = new PrismaClient();

// Parse "from 474 000" / "from 1 200 000" / "on request" → minor units or null
function parsePriceMinor(s) {
  if (!s) return null;
  const digits = String(s).replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

async function loadFrontendData() {
  const file = path.resolve(process.cwd(), '..', 'site', 'src', 'data', 'products.js');
  const mod = await import(pathToFileURL(file).href);
  return { PRODUCTS: mod.PRODUCTS, CATEGORIES: mod.CATEGORIES };
}

async function main() {
  const { PRODUCTS, CATEGORIES } = await loadFrontendData();

  // Wipe categories+products so removed entries (12-category model) don't linger.
  await prisma.cartItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // 1. Categories
  const catBySlug = new Map();
  for (const c of CATEGORIES) {
    const row = await prisma.category.create({
      data: {
        slug: c.key,
        nameEn: c.en,
        nameRu: c.ru,
        nameUz: c.uz,
        count: c.count,
      },
    });
    catBySlug.set(c.key, row.id);
  }

  // 2. Products
  for (const p of PRODUCTS) {
    const categoryId = catBySlug.get(p.cat);
    if (!categoryId) {
      console.warn(`[seed] No category for product ${p.id} (${p.model} · ${p.cat})`);
      continue;
    }
    const dia = p.dia ?? 'NA';
    const sku = `MRD-${p.model}-${dia}-${p.id}`;
    await prisma.product.create({
      data: {
        sku,
        model: p.model,
        descEn: p.desc.en,
        descRu: p.desc.ru,
        descUz: p.desc.uz,
        range: p.range,
        diameter: p.dia ?? null,
        priceText: p.price,
        priceMinor: parsePriceMinor(p.price),
        accuracy: p.acc || null,
        inStock: true,
        stockCount: 50 + ((p.id * 7) % 80),
        categoryId,
      },
    });
  }

  // 3. Admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@manokip.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash: hash, name: 'Manokip Admin', role: 'ADMIN' },
    update: { role: 'ADMIN' },
  });

  console.log(`[seed] OK · ${CATEGORIES.length} categories · ${PRODUCTS.length} products · admin=${adminEmail}`);
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
