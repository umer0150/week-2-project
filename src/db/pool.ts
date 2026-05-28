import { Pool } from "pg";
import { env } from "../config/env";

// Creates one shared database connection pool for the entire app.
// A pool reuses connections instead of opening a new one per request,
// which is much faster and uses fewer resources.
// Import this "db" object wherever you need to run a query.

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

db.connect()
  .then((client) => {
    console.log("Database connected");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });
