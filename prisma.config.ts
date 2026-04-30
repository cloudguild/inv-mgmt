import "dotenv/config";
import { defineConfig } from "prisma/config";

// For migrations, use session mode (port 5432) if available, else fall back to DATABASE_URL
const migrationUrl = (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: migrationUrl,
  },
});
