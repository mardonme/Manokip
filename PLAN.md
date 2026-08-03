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

## 🟠 Faza 1 — "Buzilgandek ko'rinadigan" narsalar & tez g'alabalar ✅ (1.3 dan tashqari)

- [x] **1.1 (M)** Soxta texnik specs olib tashlandi (AISI 304/IP65/GOST 2405-88/−18% — hammasi placeholder edi). Faqat real ma'lumot qoldi (range, aniqlik, diametr, kategoriya, SKU, stok) · `site/src/pages/Product.jsx`
- [x] **1.2 (S)** Footer real, alohida manzillarga qisqartirildi (takror "Solutions/Service" 6 link → 1 birlashgan ustun; grid 3 ustun) · `site/src/components/Chrome.jsx`, `site/src/styles.css`
- [ ] **1.3 (M)** ~~93 MB video~~ — **mijoz qarori bo'yicha hozircha o'z holida qoldirildi.** Kelajakda ~3-5 MB ga siqish tezlikni sezilarli yaxshilaydi (ffmpeg kerak) · `site/src/pages/About.jsx`
- [x] **1.4 (S)** Tekshirildi — **bug emas:** diskret standart diametrlar (50/63/100/160/250) uchun `min==max` aniq moslik to'g'ri xatti-harakat · `site/src/pages/Catalog.jsx`
- [x] **1.5 (S)** Narx " sum" qo'shimchasi endi faqat raqamli narxda (`priceMinor` bor) ko'rsatiladi · `site/src/components/ProductCard.jsx`
- [x] **1.6 (S)** Kontakt formaga alohida "Company" maydoni qo'shildi; `companyName`/`contactPerson` to'g'ri map qilindi; i18n (uz/ru/en) · `site/src/pages/Contact.jsx`, `site/src/lib/i18n.js`
- [x] **1.7 (S)** `/product` (id'siz) → `/catalog` redirect (abadiy skeleton bartaraf) · `site/src/main.jsx`

---

## 🔵 Faza 2 — SEO (B2B katalog uchun ENG muhim) — poydevor ✅

> Poydevor (meta, JSON-LD, sitemap, robots, canonical, html lang) bajarildi va `react-helmet-async`
> orqali har sahifada ishlaydi. Googlebot JS render qiladi → darrov foyda. To'liq foyda (Yandex,
> ijtimoiy skraperlar) uchun **2.1 prerender** kerak (arxitektura qarori — pastda).

- [ ] **2.1 (L)** **Prerender/SSG** — build vaqtida statik HTML (helmet meta'sini «pishirib» qo'yadi). Arxitektura qarori kutilmoqda (puppeteer/react-snap vs vite-react-ssg). SEO #1 blok
- [x] **2.2 (M)** Har sahifaga `<title>` + meta description (`react-helmet-async`, lokalizatsiya qilingan `seo.*` kalitlar) · `Seo.jsx`, barcha sahifalar
- [x] **2.3 (S)** `robots.txt` + build vaqtida `sitemap.xml` (API'dan barcha mahsulot URL'lari; `prebuild` hook) · `site/public/robots.txt`, `site/scripts/gen-sitemap.mjs`
- [~] **2.4 (M-L)** Canonical ✅ va html lang ✅ bajarildi. **`hreflang` + tilga bog'liq URL'lar** (`/ru/` `/uz/` `/en/`) — katta refaktor, arxitektura qarori kutilmoqda (2.1 bilan birga)
- [x] **2.5 (M)** JSON-LD: `Organization` + `WebSite` (site-wide), `Product` (+ AggregateRating), `BreadcrumbList` · `main.jsx`, `Product.jsx`
- [x] **2.6 (S)** OG/twitter tag'lar absolute URL'ga; `og:url`, `og:image` 1200×630; `site/public/og-cover.jpg` (logo.svg'dan, qorong'i fonda) yaratildi · `Seo.jsx`, `index.html`, `site/public/og-cover.jpg`
- [x] **2.7 (S)** `<html lang>` faol tilga qarab dinamik (`Seo.jsx` `htmlAttributes`)

---

## 🟣 Faza 3 — Performance & caching ✅ (3.1/3.6 dan tashqari)

- [~] **3.1 (M)** Cert rasmlari allaqachon `loading="lazy"` + `aspect-ratio` (CLS/blok yo'q, kritik yo'lda emas). To'liq WebP/`srcset` konversiya **keyinga** — image tooling (sharp/cwebp) kerak · `site/public/certs/`
- [x] **3.2 (S)** Fonts `@import` olib tashlandi → index.html'da non-blocking `<link rel=preload>` (`display=swap`) · `index.html`, `styles.css`
- [x] **3.3 (S)** Tavsiya etilgan nginx config (gzip/brotli + `/assets/` immutable + SPA fallback) repo'ga qo'shildi — VPS'da qo'llash kerak · `deploy/nginx.conf.example`
- [x] **3.4 (M)** API GET (products/categories) ga `Cache-Control` qo'shildi → brauzer HTTP-cache takror navigatsiyada tarmoqqa bormaydi. (TanStack Query keyinga — server header'lari asosiy foydani beradi) · `server/src/routes/products.js`, `categories.js`
- [x] **3.5 (S)** Vendor chunk ajratildi (`manualChunks`) — app 61KB / vendor 180KB alohida → kod o'zgarishi vendor cache'ini buzmaydi · `site/vite.config.js`
- [ ] **3.6 (M)** i18n lug'atini til bo'yicha bo'lib lazy-load — keyinga (hozir vendor chunk'da; foyda kichikroq) · `site/src/lib/i18n.js`
- [x] **3.7 (S)** Prod build'da `console`/`debugger` drop (faqat build, dev'da qoladi) · `site/vite.config.js`
- [x] **3.8 (S)** Mahsulot hero rasmiga `fetchpriority="high"` + `decoding="async"` (LCP) · `site/src/pages/Product.jsx`

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
