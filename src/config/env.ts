import dotenv from "dotenv";
dotenv.config();

function get(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

export const env = {
  PORT:               parseInt(process.env.PORT || "3000", 10),
  NODE_ENV:           process.env.NODE_ENV || "development",
  DATABASE_URL:       get("DATABASE_URL"),
  JWT_SECRET:         get("JWT_SECRET"),
  ACCESS_EXPIRES_IN:  process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  BCRYPT_ROUNDS:      parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),

  DB_USER: process.env.DB_USER,
  DB_HOST:process.env.DB_HOST,
  DB_NAME :process.env.DB_NAME,
  DB_PASSWORD:process.env.DB_PASSWORD,
  DB_PORT:process.env.DB_PORT,
};

