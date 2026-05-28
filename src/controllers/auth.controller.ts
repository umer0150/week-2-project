import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db/pool";
import { env } from "../config/env";

// Zod schemas -------

export const registerSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(32)
             .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
               "Need uppercase, lowercase, and a number"),
});

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

//  Helpers ------

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

//  REGISTER ----

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  try {
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

//  LOGIN -----

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    const dummyHash = "$2a$12$dummyhashtopreventtimingattacksonloginroute00000000000";
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !valid) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const { accessToken, refreshToken } = signTokens(user.id, user.role);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashToken(refreshToken), expiresAt]
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
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

    // Get refresh token
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      env.JWT_SECRET
    ) as {
      userId: string;
      role: string;
    };

    // Hash refresh token
    const hashedToken = hashToken(refreshToken);

    // Check token in database
    const tokenResult = await db.query(
      `
      SELECT * FROM refresh_tokens
      WHERE token_hash = $1
      `,
      [hashedToken]
    );

    //If token not found
    if (tokenResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });

      return;
    }

    // Find user
    const userResult = await db.query(
      `
      SELECT id, role
      FROM users
      WHERE id = $1
      `,
      [decoded.userId]
    );

    const user = userResult.rows[0];

    // User not found
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });

      return;
    }

    // Create new access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    // 9. Send new access token
    res.json({
      success: true,
      accessToken,
    });

  } catch (error) {

    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });

  }
}

// Logout ----

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  try {
    const result = await db.query(
      `UPDATE refresh_tokens 
       SET revoked = true 
       WHERE token_hash = $1 AND revoked = false`,
      [hashToken(refreshToken)]
    );

    if (result.rowCount === 0) {
      res.status(400).json({
        success: false,
        message: "Invalid or already logged out token",
      });
      return;
    }

    res.json({ success: true, message: "Logged out" });

  } catch (err) {
    console.error("logout error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ME (protected) ---

export async function me(req: Request, res: Response) {
  try {

    // Get current user from database
    const result = await db.query(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = $1
      `,
      [req.user?.userId]
    );

    const user = result.rows[0];

    // User not found
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });

      return;
    }

    // Send user data
    res.json({
      success: true,
      user,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }
}

// ADMIN: all users ----

export async function allUsers(req: Request, res: Response): Promise<void> {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("allUsers error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
