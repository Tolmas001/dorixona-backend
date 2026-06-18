# Dorixona Backend

Backend Dockerga bog‘lanmagan. Prisma to‘g‘ridan-to‘g‘ri lokal PostgreSQL bazasiga ulanadi.

## 1. Lokal PostgreSQL tayyorlash

PostgreSQL kompyuteringizda o‘rnatilgan va ishga tushgan bo‘lishi kerak.

macOS Homebrew ishlatsangiz:

```bash
pnpm db:start
```

Statusni tekshirish:

```bash
pnpm db:status
```

Bu loyiha lokal PostgreSQLni `5433` portda ishlatadi. Sizdagi Homebrew PostgreSQL logida server `127.0.0.1:5433`da tayyor bo‘lgani ko‘rindi.

## 2. Environment sozlash

```bash
cp .env.example .env
```

`.env` ichidagi `DATABASE_URL` lokal PostgreSQLga qarashi kerak:

```env
DATABASE_URL="postgresql://urinovtolmas@localhost:5433/dorixona_db?schema=public"
```

## 3. Prisma migratsiyalar

```bash
pnpm db:setup
```

Developmentda yangi migration yaratish kerak bo‘lsa:

```bash
pnpm prisma:migrate
```

## 4. Seed

Demo super admin va boshlang‘ich ma’lumotlar kerak bo‘lsa:

```bash
pnpm prisma:seed
```

`pnpm db:setup` komandasi baza yaratish, migration, Prisma generate va seedni ketma-ket bajaradi.

## 5. Backendni ishga tushirish

```bash
pnpm dev
```

Backend default:

```txt
http://127.0.0.1:3004
```

Frontend Vite proxy `/server` so‘rovlarini shu backendga yuboradi.

## Eslatma

- Docker kerak emas.
- Asosiy sozlama Prisma `DATABASE_URL` orqali boshqariladi.
