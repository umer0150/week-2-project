import { Pool } from "pg";
import { env } from "../config/env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: false,                          // ← fixes SSL warning
});

export const connectDB = async (): Promise<void> => {
  try {
    await db.query("SELECT 1");
    console.log("✅ PostgreSQL Connected");
  } catch (error) {
    console.error("❌ Database Connection Error");
    console.error(error);
    process.exit(1);
  }
};