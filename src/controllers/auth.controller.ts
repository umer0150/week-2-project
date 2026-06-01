import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db/pool";
import { env } from "../config/env";

// Zod schemas -------

export const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8)
    .max(32)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Need uppercase, lowercase, and a number",
    ),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

// Helpers ------

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signTokens(userId: string, role: string) {
  const payload = { userId, role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  return { accessToken, refreshToken };
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// REGISTER ----

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid input",
      });
      return;
    }

    const { name, email, password } = parsed.data;

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Email already registered",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const result = await db.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, role, created_at
      `,
      [name, email, passwordHash],
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// LOGIN -----


export async function login(req: Request, res: Response): Promise<void> {
  // FIX 1: validate input with loginSchema (was missing before)
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid input",
    });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const result = await db.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
      [email],
    );
    const user = result.rows[0];

    const dummyHash =
      "$2a$12$dummyhashtopreventtimingattacksonloginroute00000000000";
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !valid) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const { accessToken, refreshToken } = signTokens(user.id, user.role);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashToken(refreshToken), expiresAt],
    );

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// REFRESH TOKEN ROTATION -----

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
      userId: string;
      role: string;
    };

    const hashedToken = hashToken(refreshToken);

    const tokenResult = await db.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      [hashedToken],
    );

    if (!tokenResult.rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const userResult = await db.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [decoded.userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    await db.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [
      hashedToken,
    ]);

    const { accessToken, refreshToken: newRefreshToken } = signTokens(
      user.id,
      user.role,
    );

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [
        user.id,
        hashToken(newRefreshToken),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ],
    );

    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    return res.json({
      success: true,
      accessToken,
      user,
    });
  } catch (error) {
    console.error("refresh error:", (error as Error).message);
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
}

// LOGOUT ----

export async function logout(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await db.query(
        `DELETE FROM refresh_tokens WHERE token_hash = $1`,
        [hashToken(refreshToken)],
      );
    }

    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// ME (protected) ---

export async function me(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await db.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("me error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// ADMIN: all users ----

export async function allUsers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
      return;
    }

    const result = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       ORDER BY created_at DESC`,
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("allUsers error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}