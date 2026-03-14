import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node ./prisma/seed.ts",
  },
  datasource: {
    // Ye line change karo: process.env.DATABASE_URL use karo
    url: process.env.DATABASE_URL || "postgresql://swayammishra:9870066247@localhost:5432/cricketxi",
  },
});