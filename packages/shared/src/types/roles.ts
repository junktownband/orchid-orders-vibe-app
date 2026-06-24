export const roles = ["OWNER", "ADMIN", "MANAGER", "MASTER"] as const;

export type Role = (typeof roles)[number];
