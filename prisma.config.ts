import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // DIRECT_URL bypasses PgBouncer for migrations (Supabase port 5432)
    // Falls back to DATABASE_URL if DIRECT_URL not set
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
