import { Pool } from "pg";
import { env } from "../config/env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,
});

db.connect()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error(err.message));