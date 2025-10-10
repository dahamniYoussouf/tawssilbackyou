import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const securityMiddlewares = [
  helmet(),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
      status: 429,
      error: "Too many requests, please try again later.",
    },
  }),
];
