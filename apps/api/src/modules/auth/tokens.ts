import jwt from "jsonwebtoken";

const fallbackAccessSecret = "change-me-access";
const fallbackRefreshSecret = "change-me-refresh";
const minProductionSecretLength = 32;

function resolveJwtSecret(envName: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET", fallback: string) {
  const secret = process.env[envName];

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === fallback || secret.length < minProductionSecretLength) {
      throw new Error(`${envName} must be set to at least ${minProductionSecretLength} characters in production.`);
    }
  }

  return secret ?? fallback;
}

const accessSecret = resolveJwtSecret("JWT_ACCESS_SECRET", fallbackAccessSecret);
const refreshSecret = resolveJwtSecret("JWT_REFRESH_SECRET", fallbackRefreshSecret);

export type AuthTokenPayload = {
  userId: string;
  membershipId: string;
  organizationId: string;
  role: string;
};

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, accessSecret, {
    expiresIn: "15m"
  });
}

export function signRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, refreshSecret, {
    expiresIn: "30d"
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as AuthTokenPayload;
}
