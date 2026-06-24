import bcrypt from "bcryptjs";

import { apiErrorCodes, type AuthUser, type FieldError, type LoginRequest } from "@orchid/shared";

import { findMembershipContext, findUserForLogin } from "./repository.js";
import {
  signAccessToken,
  signRefreshToken,
  type AuthTokenPayload,
  verifyAccessToken,
  verifyRefreshToken
} from "./tokens.js";

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly errors: FieldError[] = []
  ) {
    super(message);
  }
}

function toAuthUser(context: NonNullable<Awaited<ReturnType<typeof findMembershipContext>>>): AuthUser {
  return {
    id: context.user.id,
    email: context.user.email,
    name: context.user.name,
    role: context.role,
    organization: {
      id: context.organization.id,
      name: context.organization.name,
      currency: context.organization.currency,
      timezone: context.organization.timezone
    }
  };
}

export type AuthContext = AuthTokenPayload & {
  user: AuthUser;
};

function toPayload(context: NonNullable<Awaited<ReturnType<typeof findMembershipContext>>>): AuthTokenPayload {
  return {
    userId: context.userId,
    membershipId: context.id,
    organizationId: context.organizationId,
    role: context.role
  };
}

export async function login(input: LoginRequest) {
  const user = await findUserForLogin(input.email.toLowerCase());

  if (!user || !user.isActive) {
    throw new AuthError(apiErrorCodes.unauthorized, "Invalid email or password", 401);
  }

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordOk) {
    throw new AuthError(apiErrorCodes.unauthorized, "Invalid email or password", 401);
  }

  const membership = user.memberships[0];

  if (!membership) {
    throw new AuthError(apiErrorCodes.forbidden, "User has no active organization", 403);
  }

  const context = await findMembershipContext(user.id, membership.id);

  if (!context) {
    throw new AuthError(apiErrorCodes.forbidden, "User has no active organization", 403);
  }

  const payload = toPayload(context);

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: toAuthUser(context)
  };
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) {
    throw new AuthError(apiErrorCodes.unauthorized, "Missing refresh token", 401);
  }

  let payload: AuthTokenPayload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError(apiErrorCodes.unauthorized, "Session is no longer valid", 401);
  }

  const context = await findMembershipContext(payload.userId, payload.membershipId);

  if (!context) {
    throw new AuthError(apiErrorCodes.unauthorized, "Session is no longer valid", 401);
  }

  const nextPayload = toPayload(context);

  return {
    accessToken: signAccessToken(nextPayload),
    refreshToken: signRefreshToken(nextPayload),
    user: toAuthUser(context)
  };
}

export async function me(authorization: string | undefined) {
  const context = await authenticate(authorization);

  return context.user;
}

export async function authenticate(authorization: string | undefined): Promise<AuthContext> {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;

  if (!token) {
    throw new AuthError(apiErrorCodes.unauthorized, "Missing access token", 401);
  }

  let payload: AuthTokenPayload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AuthError(apiErrorCodes.unauthorized, "Session is no longer valid", 401);
  }

  const context = await findMembershipContext(payload.userId, payload.membershipId);

  if (!context) {
    throw new AuthError(apiErrorCodes.unauthorized, "Session is no longer valid", 401);
  }

  return {
    ...toPayload(context),
    user: toAuthUser(context)
  };
}
