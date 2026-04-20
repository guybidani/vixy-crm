import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Assign the parsed result back so downstream handlers see the
      // sanitized body — zod strips unknown keys and applies defaults
      // that were previously silently discarded.
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: err.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        });
      }
      next(err);
    }
  };
}
