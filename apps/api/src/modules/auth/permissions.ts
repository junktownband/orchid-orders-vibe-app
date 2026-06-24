import { apiErrorCodes } from "@orchid/shared";

import { AuthError } from "./service.js";

const roleRank = {
  MASTER: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4
} as const;

export type KnownRole = keyof typeof roleRank;

export function assertRoleAtLeast(actualRole: string, requiredRole: KnownRole) {
  const actualRank = roleRank[actualRole as KnownRole];

  if (actualRank === undefined || actualRank < roleRank[requiredRole]) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

export function organizationScope(organizationId: string) {
  return {
    organizationId
  };
}
