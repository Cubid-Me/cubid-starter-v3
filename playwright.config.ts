import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const app = "http://127.0.0.1:4301";
const issuer = "http://127.0.0.1:4302";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: app },
  webServer: [
    {
      command: "node e2e/issuer.mjs",
      url: `${issuer}/.well-known/openid-configuration`,
    },
    {
      command: "pnpm start --hostname 127.0.0.1 --port 4301",
      url: app,
      env: {
        CUBID_SIWC_ISSUER_URL: issuer,
        CUBID_SIWC_CLIENT_ID: "starter-e2e",
        CUBID_SIWC_REDIRECT_URI: `${app}/api/cubid/siwc/callback`,
        CUBID_SIWC_COOKIE_SECRET: randomBytes(32).toString("hex"),
        CUBID_SIWC_SCOPE: "openid profile email",
      },
    },
  ],
});
