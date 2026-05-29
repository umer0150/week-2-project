import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const connectDB = async (): Promise<void> => {
  try {
    await pool.query("SELECT NOW()");

    console.log("PostgreSQL Connected");
  } catch (error) {
    console.error("Database Connection Error");
    console.error(error);

    process.exit(1);
  }
};

export { pool, connectDB };