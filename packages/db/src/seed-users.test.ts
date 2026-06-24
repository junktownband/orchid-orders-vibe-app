import { describe, expect, it } from "vitest";

import { productionUsers, resolveSeedPasswordForUser } from "./seed-users.js";

describe("seed user passwords", () => {
  it("uses a dedicated environment password for each seeded production user", () => {
    const env = {
      ORCHID_SEED_PASSWORD: "shared-password",
      ORCHID_SEED_PASSWORD_SASHA: "sasha-password",
      ORCHID_SEED_PASSWORD_ROMA: "roma-password",
      ORCHID_SEED_PASSWORD_YURA: "yura-password",
      ORCHID_SEED_PASSWORD_LENYA: "lenya-password",
      ORCHID_SEED_PASSWORD_VANYA: "vanya-password",
      ORCHID_SEED_PASSWORD_DIMA: "dima-password"
    };

    expect(Object.fromEntries(productionUsers.map((user) => [user.email, resolveSeedPasswordForUser(user, env, "production")]))).toEqual({
      "sasha@orchid.local": "sasha-password",
      "roma@orchid.local": "roma-password",
      "yura@orchid.local": "yura-password",
      "lenya@orchid.local": "lenya-password",
      "vanya@orchid.local": "vanya-password",
      "dima@orchid.local": "dima-password"
    });
  });

  it("keeps the shared seed password as a production fallback", () => {
    const env = {
      ORCHID_SEED_PASSWORD: "shared-password"
    };

    expect(resolveSeedPasswordForUser(productionUsers[0], env, "production")).toBe("shared-password");
  });
});
