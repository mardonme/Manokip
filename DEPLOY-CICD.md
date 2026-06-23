# GitHub orqali deploy (CI/CD)

Bu loyiha GitHub Actions orqali serverga (VPS `176.57.184.199` / **luva.uz**) deploy qilinadi.

- **Frontend** — `main` ga `site/**` ichida har push qilinganda **avtomatik** deploy bo'ladi
  (GitHub bulutida build → server `/opt/manokip/site/dist/` ga rsync). Server tayyorlash shart emas.
- **Backend** — faqat **qo'lda**: Actions tab → *Deploy backend (manual)* → *Run workflow*.

Workflow fayllari: [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml),
[.github/workflows/deploy-backend.yml](.github/workflows/deploy-backend.yml).

---

## Bir martalik sozlash (siz bajarasiz)

### 1. Deploy uchun SSH kalit yarating (lokal mashinangizda)

```bash
ssh-keygen -t ed25519 -C "github-actions-manokip" -f manokip_deploy -N ""
# → manokip_deploy  (maxfiy kalit)  va  manokip_deploy.pub  (ochiq kalit)
```

### 2. Ochiq kalitni serverga qo'shing

```bash
ssh-copy-id -i manokip_deploy.pub root@176.57.184.199
# yoki qo'lda: manokip_deploy.pub mazmunini serverdagi
# /root/.ssh/authorized_keys fayliga qo'shing
```

Tekshirish:
```bash
ssh -i manokip_deploy root@176.57.184.199 'echo OK'
```

### 3. GitHub'ga maxfiy ma'lumotlarni (Secrets) qo'shing

Repo → **Settings → Secrets and variables → Actions → New repository secret**, 3 ta secret:

| Nom | Qiymat |
|-----|--------|
| `DEPLOY_SSH_KEY` | `manokip_deploy` (MAXFIY kalit) faylining to'liq mazmuni — `-----BEGIN…` dan `…END-----` gacha |
| `DEPLOY_HOST` | `176.57.184.199` |
| `DEPLOY_USER` | `root` |

### 4. Maxfiy kalitni lokaldan o'chiring (xavfsizlik)

```bash
rm manokip_deploy manokip_deploy.pub
```

### 5. Workflow fayllarni GitHub'ga push qiling

```bash
git add .github DEPLOY-CICD.md
git commit -m "ci: GitHub Actions deploy (frontend auto, backend manual)"
git push
```

Shundan keyin: `site/**` ga har push → frontend avtomatik `luva.uz` ga chiqadi.
Birinchi marta qo'lda sinab ko'rish: Actions tab → *Deploy frontend* → *Run workflow*.

---

## Kundalik ish

- **Frontend o'zgarishi:** kod yozasiz → `git push` → ~1 daqiqada `luva.uz` yangilanadi.
- **Backend o'zgarishi:** Actions → *Deploy backend (manual)* → *Run workflow*
  (kerak bo'lsa *reseed* belgilashingiz mumkin — DB seed ma'lumotini qayta yozadi).

## Xavfsizlik bo'yicha eslatma

Hozir `root` ishlatilmoqda (mavjud sozlama bilan mos). Yanada xavfsizroq variant —
alohida cheklangan `deploy` foydalanuvchisi yoki SSH kalitiga `command="..."` cheklovi
qo'yish. Xohlasangiz keyin shu tarzda mustahkamlab beraman.
