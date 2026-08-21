# Deploy qo'llanmasi — manokip.com.uz

## Qisqasi

```
git push        →  hammasi o'zi chiqadi
```

Boshqa hech narsa qilish shart emas: SSH ham, tugma ham, secret ham kerak emas.
`main` ga push qilingach GitHub Actions VPS'dagi runner'da quyidagilarni shu
tartibda bajaradi:

| # | Bosqich | Nima bo'ladi |
|---|---------|--------------|
| 1 | **Zaxira** | Baza + yuklangan rasmlar `/opt/manokip/backups/` ga saqlanadi |
| 2 | **Tekshiruv** | Ma'lumot o'chiradigan migratsiya bo'lsa — **deploy to'xtaydi**, serverga tegilmaydi |
| 3 | **Backend** | Kod ko'chiriladi, API qayta quriladi, migratsiya qo'llanadi. Ko'tarilmasa — **avtomatik eski versiyaga qaytadi** |
| 4 | **Frontend** | Sayt build qilinib nashr qilinadi (faqat API tayyor bo'lgandan keyin) |
| 5 | **Nazorat** | Har bir jadvaldagi qatorlar soni deploy oldi/keyini bilan solishtiriladi. Kamaygan bo'lsa — qizil xato |

O'zgargan qismi o'zi aniqlanadi: faqat `site/**` tegilgan bo'lsa API qayta
ishga tushmaydi, faqat `server/**` bo'lsa sayt qayta build qilinmaydi.

Natijani Actions tab'da ko'rasiz: har bir deploy oxirida qaysi zaxira nusxa
olingani yozilib qoladi.

**Qo'lda ishga tushirish** (kod o'zgarmasa ham): Actions → *Deploy → manokip.com.uz*
→ *Run workflow* → `target`: `auto` / `backend` / `frontend` / `both`.

---

## Ma'lumot xavfsizligi kafolatlari

Deploy **hech qachon** quyidagilarga tegmaydi:

- `/opt/manokip/.env` — parollar, tokenlar (rsync'da `--exclude`)
- Postgres volume `manokip_manokip-db-data` — baza fayllari
- Uploads volume `manokip_manokip-uploads` — admin yuklagan rasmlar
- `docker-compose.yml` va `Dockerfile` — VPS nusxasi qo'lda tahrirlanadi

Bundan tashqari:

- **Har kuni 02:00** da avtomatik zaxira nusxa olinadi
  ([backup.yml](.github/workflows/backup.yml)) — deploy bo'lmasa ham.
- Oxirgi **30 ta** nusxa saqlanadi (`KEEP` bilan o'zgartiriladi).
- Har bir nusxa olingandan keyin **o'qib tekshiriladi** (buzilgan arxiv zaxira hisoblanmaydi).
- `npm run seed` bazada real buyurtma/so'rov/sharh bo'lsa **ishlashdan bosh tortadi**
  (katalogni o'chirib yuboradi). Ataylab kerak bo'lsa: `FORCE_SEED=yes npm run seed`.
- Migratsiyada `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM` bo'lsa deploy
  boshlanmaydi. Ataylab kerak bo'lsa workflow'ni `ALLOW_DESTRUCTIVE_MIGRATION=yes`
  bilan qayta ishga tushiring.

---

## Zaxiradan tiklash

```bash
ssh root@176.57.184.199

# 1. Mavjud nusxalarni ko'rish
bash /opt/manokip/bin/restore.sh

# 2. Kerakligini tanlab tiklash (tasdiqlash so'raydi)
bash /opt/manokip/bin/restore.sh 20260821-021500-nightly-db.sql.gz
```

Tiklash tartibi: avval **hozirgi holatdan yana bitta zaxira** olinadi (ya'ni
tiklashning o'zi ham qaytariladigan), keyin API to'xtatiladi, baza yuklanadi,
rasmlar tiklanadi, API qayta ko'tariladi va `/api/health` javob berishi kutiladi.

**Nusxani o'z kompyuteringizga olish** (VPS bilan bir narsa bo'lsa):

```bash
scp root@176.57.184.199:/opt/manokip/backups/*-db.sql.gz ~/manokip-backups/
```

---

## Qo'lda zaxira olish (masalan, katta o'zgarishdan oldin)

```bash
ssh root@176.57.184.199
bash /opt/manokip/bin/backup.sh mening-belgim
```

---

## Hech qachon qilmang

- ❌ `docker compose down -v` — `-v` bayrog'i **bazani butunlay o'chiradi**.
  To'xtatish kerak bo'lsa: `docker compose stop`.
- ❌ Productionda `npm run seed` (himoya bor, lekin `FORCE_SEED` bilan chetlab o'tiladi).
- ❌ `prisma migrate reset` / `prisma db push --accept-data-loss` — production bazada hech qachon.
- ❌ Migratsiyada ustun o'chirish. To'g'ri yo'l: yangi ustun qo'shish → ma'lumotni
  ko'chirish → keyingi relizda eskisini o'chirish (o'shanda ham zaxira bilan).

---

## Fayllar

| Fayl | Vazifasi |
|------|----------|
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | Yagona deploy (push yoki qo'lda) |
| [.github/workflows/backup.yml](.github/workflows/backup.yml) | Kunlik avtomatik zaxira |
| [deploy/backup.sh](deploy/backup.sh) | Baza + rasmlar zaxirasi, tekshirish, eskilarini tozalash |
| [deploy/restore.sh](deploy/restore.sh) | Zaxiradan tiklash (tasdiqlash bilan) |
| [deploy/check-migrations.sh](deploy/check-migrations.sh) | Ma'lumot o'chiradigan migratsiyani bloklash |
| [deploy/data-guard.sh](deploy/data-guard.sh) | Deploy oldi/keyin qatorlar sonini solishtirish |
| [deploy/docker-compose.prod.yml](deploy/docker-compose.prod.yml) | VPS'dagi `/opt/manokip/docker-compose.yml` nusxasi |

Serverda skriptlar `/opt/manokip/bin/` da turadi va har deployda yangilanadi.

---

## Server tuzilishi (ma'lumot uchun)

- VPS `176.57.184.199`, kod `/opt/manokip/`
- `manokip-api` konteyneri — `127.0.0.1:4000`, nginx `/api` va `/uploads` ni shunga uzatadi
- `manokip-db` konteyneri — Postgres 16, tashqariga ochilmagan
- Sayt fayllari `/opt/manokip/site/dist/`, nginx shundan xizmat qiladi
- GitHub runner: `actions.runner.mardonme-Manokip.manokip-vps.service`
