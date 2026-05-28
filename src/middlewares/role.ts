import { Request, Response, NextFunction } from "express";

export function requireRole(role: string) {

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    // Check user exists
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Not logged in",
      });

      return;
    }

    // Check role
    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });

      return;
    }

    // Continue
    next();

  };

}