import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const HERE = path.dirname(fileURLToPath(import.meta.url));

// Product photos extracted from the printed sheets live in prisma/catalog-images/
// (named <SKU>.png). They are copied into the uploads dir under catalog/ so the
// existing /uploads static route (and the prod nginx /uploads proxy) serves them
// without extra config. Admin-uploaded replacements never collide: those get
// random hex names directly in uploads/.
const IMAGES_DIR = path.join(HERE, 'catalog-images');
const UPLOAD_CATALOG_DIR = path.resolve(HERE, '..', 'uploads', 'catalog');

function installImage(file) {
  if (!file) return null;
  const src = path.join(IMAGES_DIR, file);
  if (!existsSync(src)) {
    console.warn(`[seed] missing catalog image: ${file}`);
    return null;
  }
  copyFileSync(src, path.join(UPLOAD_CATALOG_DIR, file));
  return `/uploads/catalog/${file}`;
}

// The catalogue is generated from the printed product sheets (mahsulotlar_katalogi.pdf).
// Editing it here is fine; the admin panel is the day-to-day way to change products.
function loadCatalog() {
  return JSON.parse(readFileSync(path.join(HERE, 'catalog-data.json'), 'utf8'));
}

async function main() {
  const { categories, specLabels, products } = loadCatalog();
  mkdirSync(UPLOAD_CATALOG_DIR, { recursive: true });

  // Wipe catalogue tables so removed sheets don't linger. Carts and orders
  // reference products, so they go first.
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productSpec.deleteMany();
  await prisma.product.deleteMany();
  await prisma.specLabel.deleteMany();
  await prisma.category.deleteMany();

  // 1. Categories — families first so children can point at a real parent id.
  const catBySlug = new Map();
  for (const c of categories.filter((c) => !c.parent)) {
    const row = await prisma.category.create({
      data: {
        slug: c.slug, nameEn: c.nameEn, nameRu: c.nameRu, nameUz: c.nameUz,
        sortOrder: c.sortOrder,
      },
    });
    catBySlug.set(c.slug, row.id);
  }
  for (const c of categories.filter((c) => c.parent)) {
    const row = await prisma.category.create({
      data: {
        slug: c.slug, nameEn: c.nameEn, nameRu: c.nameRu, nameUz: c.nameUz,
        sortOrder: c.sortOrder, parentId: catBySlug.get(c.parent),
      },
    });
    catBySlug.set(c.slug, row.id);
  }

  // 2. Spec label dictionary — one translated row per distinct sheet label.
  const labelBySlug = new Map();
  for (const l of specLabels) {
    const row = await prisma.specLabel.create({
      data: {
        slug: l.slug, labelEn: l.labelEn, labelRu: l.labelRu, labelUz: l.labelUz,
        sortOrder: l.sortOrder,
      },
    });
    labelBySlug.set(l.slug, row.id);
  }

  // 3. Products with their spec rows.
  for (const p of products) {
    const categoryId = catBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`[seed] no category for ${p.sku} (${p.categorySlug})`);
      continue;
    }
    await prisma.product.create({
      data: {
        sku: p.sku,
        model: p.model,
        variantEn: p.variantEn, variantRu: p.variantRu, variantUz: p.variantUz,
        descEn: p.descEn, descRu: p.descRu, descUz: p.descUz,
        diameter: p.diameter, accuracy: p.accuracy,
        availability: p.availability, leadTimeDays: p.leadTimeDays,
        imageUrl: installImage(p.image),
        categoryId,
        specs: {
          create: p.specs.map((s) => ({
            labelId: labelBySlug.get(s.labelSlug),
            valueEn: s.valueEn, valueRu: s.valueRu, valueUz: s.valueUz,
            sortOrder: s.sortOrder,
          })),
        },
      },
    });
  }

  // 4. Denormalised per-category product counts (a family counts its children's).
  for (const [slug, id] of catBySlug) {
    const own = await prisma.product.count({ where: { categoryId: id } });
    const kids = await prisma.product.count({ where: { category: { parentId: id } } });
    await prisma.category.update({ where: { id }, data: { count: own + kids } });
    void slug;
  }

  // 5. Admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@manokip.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash: hash, name: 'Manokip Admin', role: 'ADMIN' },
    update: { role: 'ADMIN' },
  });

  const specCount = await prisma.productSpec.count();
  console.log(`[seed] OK · ${categories.length} categories · ${specLabels.length} spec labels · `
    + `${products.length} products · ${specCount} spec rows · admin=${adminEmail}`);
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
