import { Prisma, Role } from "@prisma/client";

export type SeedMode = "demo" | "production";

export type SeedUser = {
  email: string;
  name: string;
  role: Role;
  passwordEnvName: string;
  commissionPercent?: Prisma.Decimal | null;
};

export const demoSeedPassword = "orchid12345";

export const productionUsers: SeedUser[] = [
  {
    email: "sasha@orchid.local",
    name: "Саша",
    role: Role.OWNER,
    passwordEnvName: "ORCHID_SEED_PASSWORD_SASHA",
    commissionPercent: null
  },
  {
    email: "roma@orchid.local",
    name: "Рома",
    role: Role.ADMIN,
    passwordEnvName: "ORCHID_SEED_PASSWORD_ROMA",
    commissionPercent: null
  },
  {
    email: "yura@orchid.local",
    name: "Юра",
    role: Role.ADMIN,
    passwordEnvName: "ORCHID_SEED_PASSWORD_YURA",
    commissionPercent: null
  },
  {
    email: "lenya@orchid.local",
    name: "Леня",
    role: Role.ADMIN,
    passwordEnvName: "ORCHID_SEED_PASSWORD_LENYA",
    commissionPercent: null
  },
  {
    email: "vanya@orchid.local",
    name: "Ваня",
    role: Role.MANAGER,
    passwordEnvName: "ORCHID_SEED_PASSWORD_VANYA",
    commissionPercent: null
  },
  {
    email: "dima@orchid.local",
    name: "Дима",
    role: Role.MASTER,
    passwordEnvName: "ORCHID_SEED_PASSWORD_DIMA",
    commissionPercent: new Prisma.Decimal("0.3000")
  }
];

export function resolveSeedPasswordForUser(user: SeedUser, env: NodeJS.ProcessEnv | Record<string, string | undefined>, seedMode: SeedMode) {
  const dedicatedPassword = env[user.passwordEnvName];

  if (dedicatedPassword) {
    return dedicatedPassword;
  }

  if (env.ORCHID_SEED_PASSWORD) {
    return env.ORCHID_SEED_PASSWORD;
  }

  if (seedMode === "production") {
    throw new Error(`${user.passwordEnvName} or ORCHID_SEED_PASSWORD is required for production seed.`);
  }

  return demoSeedPassword;
}
