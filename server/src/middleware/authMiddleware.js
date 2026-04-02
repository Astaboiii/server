import { getUserById } from "../services/userService.js";
import { verifyToken } from "../lib/tokenService.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        message: "Session is no longer valid.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}

