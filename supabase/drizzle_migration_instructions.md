# Drizzle Migration Instructions for Supabase

This guide will help you migrate your Drizzle schema to your Supabase Postgres database using Drizzle Kit.

---

## 1. Set Up Environment Variables

Add your Supabase Postgres connection string to your `.env` file:

```
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
```

You can find this in Supabase → Project Settings → Database → Connection string.

---

## 2. Install Drizzle Kit

If you haven't already:

```
npm install -D drizzle-kit
```

---

## 3. Generate Migration SQL

Run this command in your project root:

```
npx drizzle-kit generate:pg --schema=./db/schema.ts
```

This will create a migration SQL file in the `drizzle/migrations` folder.

---

## 4. Apply Migration to Supabase

Run:

```
npx drizzle-kit push:pg --schema=./db/schema.ts
```

This will apply the migration directly to your Supabase database using the connection string from `.env`.

---

## 5. Verify Migration

Go to your Supabase dashboard → Table Editor to confirm your tables and enums are created.

---

## Notes

- Make sure your local IP is allowed in Supabase database network settings.
- Use `.env` (not `.env.local`) for Drizzle Kit to pick up the variable.
- You can re-run the migration commands if you update your schema.

---

## Troubleshooting

- If you get connection errors, check your Supabase network settings and credentials.
- If tables are missing, check your schema files and migration logs.

---

You're now ready to use Drizzle ORM with Supabase!
