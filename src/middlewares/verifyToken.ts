
import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const BASE_URL =
  process.env.BETTER_AUTH_URL || "http://localhost:5000";

const jwks = createRemoteJWKSet(
  new URL(`${BASE_URL}/api/auth/jwks`)
);

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Token is missing.",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing.",
      });
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: BASE_URL,
      audience: BASE_URL,
    });

    if (!payload.sub || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid user information in token.",
      });
    }

    res.locals.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
