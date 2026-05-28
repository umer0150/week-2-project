import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

// Add user property to req
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {

  try {

    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check token exists
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Token required",
      });

      return;
    }

    // Get token only
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
    ) as {
      userId: string;
      role: string;
    };

    // Save user data in request
    req.user = decoded;

    // Continue
    next();

  } catch (error) {

    res.status(401).json({
      success: false,
      message: "Invalid token",
    });

  }
}