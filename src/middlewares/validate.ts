import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    try {

      // Validate request body
      schema.parse(req.body);

      // Continue
      next();

    } catch (error) {

      res.status(400).json({
        success: false,
        message: "Invalid data",
      });

    }

  };

}