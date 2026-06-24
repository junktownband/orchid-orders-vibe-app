const isWindows = process.platform === "win32";

function pnpmCommand(args) {
  return {
    script: isWindows ? "cmd.exe" : "corepack",
    args: isWindows ? `/c corepack pnpm ${args}` : `pnpm ${args}`,
    interpreter: "none"
  };
}

module.exports = {
  apps: [
    {
      name: "orchid-api",
      ...pnpmCommand("--filter @orchid/api start"),
      env: {
        NODE_ENV: "production",
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        APP_URL: process.env.APP_URL,
        ORCHID_COOKIE_SECURE: process.env.ORCHID_COOKIE_SECURE,
        PORT: process.env.PORT ?? "3005",
        HOST: process.env.HOST ?? "127.0.0.1"
      }
    },
    {
      name: "orchid-web",
      ...pnpmCommand("--filter @orchid/web preview"),
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
