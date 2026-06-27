# Manokip — Ishga tushirish (launch) rejasi

> Kodbaza auditi asosida (2026-06-27) tuzilgan. Yo'nalishlar: **ishga tushirishga tayyorlash**,
> **performance / SEO / xavfsizlik**, **mobil / dizayn / UX**.

## Umumiy holat

Ilova kutilganidan tayyorroq. Asosiy commerce oqimi (katalog → mahsulot → savat → buyurtma → admin)
to'liq ishlaydi va backend bilan ulangan. Admin endpoint'lar server tomonda himoyalangan
(`requireAdmin` butun router'ga), i18n (ru/uz/en) to'liq, fayl yuklash xavfsiz, SQL injection /
IDOR / Telegram HTML-escape — joyida. **Kritik, ilovani buzadigan bug yo'q.** Quyidagilar —
xavfsizlik qotirish, SEO, tezlik va polish.

**Taxminiy hajm:** Faza 0–1 ≈ 2-3 kun · Faza 2 (SEO) ≈ 3-5 kun · Faza 3-4 ≈ 3-4 kun · Faza 5 ≈ 1-2 kun.

**Eng katta ta'sirli 5 ta ish:** Faza 0 (xavfsizlik) → 1.1 (soxta specs) → 1.3 (93 MB video) →
2.1+2.2 (SEO prerender+meta) → 4.1 (modal focus-trap).

Effort belgilari: **S** ≤1soat · **M** bir necha soat · **L** kun+.

---

## 🔴 Faza 0 — Xavfsizlik bloklari ✅ BAJARILDI (2026-06-27)

> Adversarial review bilan tekshirildi (3 lens · 9 nomzod → 6 rad, 3 tasdiq). Regressiya: 0.
> Tasdiqlangan 3 topilma `migrate deploy`'ga o'tishdan kelib chiqqan edi — shu sababli 0.4
> xavfsizroq `prisma db push` (buzmaydigan) variantiga o'zgartirildi (pastга qarang).

- [x] **0.1 (S)** `JWT_SECRET` `'dev-secret'` fallback'i olib tashlandi — prod'da zaif/yo'q bo'lsa boot bo'lmaydi · `server/src/env.js`
- [~] **0.2 (S)** Kod tarafi tayyor (`.env.example` + prod'da kuchli secret majburlanadi). **QO'LDA KERAK:** Telegram bot token + Gemini key'ni almashtirish (rotate) va prod `/opt/manokip/.env`'da yangi `openssl rand -hex 64` JWT secret
- [x] **0.3 (S)** Startup'da zod env validatsiya: `DATABASE_URL`/`JWT_SECRET`/`CORS_ORIGIN` (prod'da https, `*` emas) majburiy; bo'sh-satr = o'rnatilmagan · `server/src/env.js`
- [x] **0.4 (M)** `--accept-data-loss` olib tashlandi → `build` endi buzmaydigan `prisma db push` (destruktiv o'zgarish bo'lsa deploy to'xtaydi, ma'lumot o'chmaydi). Init migration + `migrate:deploy` skript kelajakda ataylab migrate'ga o'tish uchun tayyor (baseline yo'riqnomasi `deploy-backend.yml`'da) · `server/package.json`, `server/prisma/migrations/`
- [x] **0.5 (M)** AI chat fetch'ga 10s AbortController timeout + kunlik so'rov cap (`AI_DAILY_CAP=2000`) · `server/src/lib/ai.js`
- [x] **0.6 (S)** Zod sxemalarga `.strict()` (mass-assignment yopildi) — admin formani buzmaydi · `server/src/routes/admin.js`

> **Eslatma (review, LOW):** AI kunlik cap xotirada (process'da) — bir konteyner uchun yetarli;
> gorizontal masshtablashda umumiy store (Redis/Postgres) kerak bo'ladi.

---

## 🟠 Faza 1 — "Buzilgandek ko'rinadigan" narsalar & tez g'alabalar

- [ ] **1.1 (M)** Mahsulot sahifasidagi **soxta texnik specs** — har mahsulotga bir xil "AISI 304 / IP65 / −18% / GOST 2405-88" hardcode. B2B uchun adashtiruvchi. Product field'lardan olish yoki o'chirish · `site/src/pages/Product.jsx:85-90`
- [ ] **1.2 (S)** Footer'da "Solutions" va "Service" ustunlaridagi 6 ta link bir xil sahifaga ketadi ("Training" hech qayerga) · `site/src/components/Chrome.jsx:228-229`
- [ ] **1.3 (M)** **93 MB autoplay video** (`aboutbgvideo.mp4`, `preload=auto`) + 3.7 MB GIF — About sahifasi. ~3-5 MB ga siqish + `poster`, GIF → mp4/webm · `site/src/pages/About.jsx:38-47`
- [ ] **1.4 (S)** Katalog diametr filtri `min==max` yuboradi → faqat aniq moslik, ko'p mahsulot yo'qoladi · `site/src/pages/Catalog.jsx:46-47`
- [ ] **1.5 (S)** Narx "sum" qo'shimchasi: "on request sum" / "from 380 000 sum" chiqadi · `site/src/components/ProductCard.jsx:89`, `site/src/pages/Product.jsx:135`
- [ ] **1.6 (S)** Kontakt formada "Company" maydoni yo'q — ism ham companyName ham contactPerson'ga ketadi · `site/src/pages/Contact.jsx:20-21`
- [ ] **1.7 (S)** `/product` (id'siz) marshruti abadiy skeleton ko'rsatadi → 404 yoki `/catalog`'ga redirect · `site/src/main.jsx:63`

---

## 🔵 Faza 2 — SEO (B2B katalog uchun ENG muhim)

> Hozir sayt CSR SPA — Google/Yandex bo'sh HTML ko'radi, mahsulotlar amalda topilmaydi.

- [ ] **2.1 (L)** **Prerender/SSG** — `/`, `/catalog`, `/about`, `/service` va har `/product/:id` ni build vaqtida HTML qilish (`vite-plugin-prerender` / `react-snap`, yoki Astro/Next migratsiyasi). SEO #1 blok
- [ ] **2.2 (M)** Har sahifaga `<title>` + meta description (`react-helmet-async`) — hozir hammasi bir xil · `site/index.html`, sahifalar
- [ ] **2.3 (S)** `robots.txt` + build vaqtida `sitemap.xml` (barcha mahsulot URL'lari bilan) · `site/public/`
- [ ] **2.4 (M-L)** Canonical + `hreflang` + tilga bog'liq URL'lar (`/ru/`, `/uz/`, `/en/`) — hozir 3 til bitta URL'da · `site/src/lib/LangContext.jsx`
- [ ] **2.5 (M)** JSON-LD structured data: `Product` (+ AggregateRating), `Organization`, `BreadcrumbList`
- [ ] **2.6 (S)** OG image: SVG o'rniga absolute URL'li 1200×630 PNG + `og:url`, twitter tag'lar · `site/index.html:22`
- [ ] **2.7 (S)** `<html lang>` ni faol tilga qarab dinamik qilish (hozir doim `ru`) · `site/index.html:2`

---

## 🟣 Faza 3 — Performance & caching

- [ ] **3.1 (M)** Sertifikat JPG'lari ~7 MB → WebP/AVIF + responsive `srcset` · `site/public/certs/`
- [ ] **3.2 (S)** Google Fonts `@import` → `<link>` yoki self-host (render-blocking zanjir) · `site/src/styles.css:18`
- [ ] **3.3 (S)** VPS nginx'da tekshirish: gzip/brotli yoqilganmi, `/assets/` uchun `immutable` cache header (repo'da nginx config yo'q)
- [ ] **3.4 (M)** API GET'larga `Cache-Control` + client cache (TanStack Query/SWR) — hozir har navigatsiyada qayta yuklanadi · `site/src/lib/api.js`, `server/src/routes/products.js`
- [ ] **3.5 (S)** Vendor chunk ajratish (`manualChunks`) — 227 KB bitta bundle · `site/vite.config.js`
- [ ] **3.6 (M)** i18n lug'atini (55 KB) til bo'yicha bo'lib lazy-load · `site/src/lib/i18n.js`
- [ ] **3.7 (S)** Prod build'da `console`/`debugger` drop (`esbuild.drop`) · `site/vite.config.js`
- [ ] **3.8 (S)** Mahsulot hero rasmiga `width`/`height` + `fetchpriority="high"` (CLS/LCP) · `site/src/pages/Product.jsx:121`

---

## 🟢 Faza 4 — Accessibility & mobil/UX polish

- [ ] **4.1 (M)** **Modallarga focus-trap** (bitta umumiy hook) — mobil drawer, SignInModal, AdminModal, ChatWidget hammasida yo'q · `Chrome.jsx`, `SignInModal.jsx`, `admin/ui.jsx`, `ChatWidget.jsx`
- [ ] **4.2 (M)** Touch target'lar < 44px (mobil'da yana kichrayadi) — icon, pager, stepper, stars · `site/src/styles.css`
- [ ] **4.3 (S)** Savat qatori mobil'da reflow bo'lmaydi (360px'da overflow) · `site/src/pages/Cart.jsx:53`
- [ ] **4.4 (M)** Admin jadvallari mobil'da kartochka layout (hozir horizontal scroll) · `site/src/styles.css:513`
- [ ] **4.5 (M)** Toast tizimi (savatga qo'shish, forma yuborish tasdiqlovi) — `--z-toast` allaqachon bor
- [ ] **4.6 (S)** Kontrast: `--ink-4` (#8a8d94) real matnda ishlatilmoqda (AA fail) → `--ink-3` · `site/src/styles.css:34`
- [ ] **4.7 (S)** `scroll-behavior: smooth` + scrollToTop konflikti (har navigatsiyada jank) · `site/src/main.jsx:30`
- [ ] **4.8 (L)** Eski "legacy" responsive blok (inline-style substring match) mo'rt — class tizimiga ko'chirib o'chirish · `site/src/styles.css:621-776`
- [ ] **4.9 (M)** Mobil katalog filtrlarini accordion/drawer'ga yig'ish · `site/src/pages/Catalog.jsx:104`
- [ ] **4.10 (S)** `:root { color-scheme: light }` — dark-mode qurilmalarda native control'lar to'g'ri ko'rinsin · `site/src/styles.css`

---

## ⚙️ Faza 5 — Backend hardening (launch'dan keyin ham bo'ladi)

- [ ] **5.1 (S)** Graceful shutdown (SIGTERM → server stop + Prisma disconnect + Telegram poller stop) · `server/src/index.js:65`
- [ ] **5.2 (S)** Health check'da DB tekshiruvi (`SELECT 1`) · `server/src/index.js:50`
- [ ] **5.3 (M)** Status/role'ni `String` o'rniga Prisma `enum` + FK indekslar (Order.userId, Review.productId, Product.categoryId…) · `server/prisma/schema.prisma`
- [ ] **5.4 (M)** Cart merge'ni `$transaction`'ga o'rash (N+1 + yarim-merge xavfi) · `server/src/routes/cart.js:66`
- [ ] **5.5 (M)** Review: faqat xarid qilgan user qoldira olsin + matnni plain-text render (XSS) · `server/src/routes/reviews.js`
- [ ] **5.6 (S)** 500 xatolarda generic xabar (raw `err.message` qaytmasin) · `server/src/middleware/error.js:14`
- [ ] **5.7 (M)** Telegram `getUpdates` timeout + prod'da webhook · `server/src/lib/telegram.js:150`
- [ ] **5.8 (S)** Eski config tozalash: `vercel.json` o'chirish, ChatWidget'ni design-system token'lariga keltirish · `vercel.json`, `ChatWidget.jsx`
- [ ] **5.9 (S)** Buyurtmada `priceMinor` snapshot + stock policy (decrement yoki `inStock` tekshiruvi) — B2B quote oqimi bo'lsa ixtiyoriy · `server/src/routes/orders.js:42`, `schema.prisma`

---

## Auditda tekshirilgan va JOYIDA bo'lgan narsalar (qayta tekshirish shart emas)

- Admin authorizatsiya: `requireUser, requireAdmin` butun router'ga — oddiy user 403 oladi. Privilege escalation yo'q.
- Fayl yuklash: admin-only, 5 MB limit, MIME allowlist, tasodifiy fayl nomlari, read-only servis.
- SQL injection yo'q (hammasi Prisma parametrlangan). Telegram HTML-escape bor. Order ownership (IDOR) tekshirilgan.
- `.env` gitignore'da, hech qachon commit qilinmagan.
- Frontend: barcha dinamik sahifalar real API bilan ulangan; `src/data/products.js` — seed manbasi, dead kod emas.
- Skeleton, empty state, error state, 404 sahifa — izchil va sifatli ishlangan.
