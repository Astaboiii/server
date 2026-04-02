import jwt from "jsonwebtoken";

export function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || "dev-jwt-secret",
    {
      expiresIn: "7d",
    }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev-jwt-secret");
}

