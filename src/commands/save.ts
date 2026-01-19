import chalk from "chalk";
import ora from "ora";
import { getAuthPath, getAuthsPath } from "../utils/paths.js";
import { readAuthData, readAuthsData, writeAuthsData, fileExists } from "../utils/file.js";
import { decodeJWT } from "../utils/jwt.js";
import { selectLatestAuth } from "../utils/auth.js";
import { fetchRateLimitWithAuth } from "../services/rateLimit.js";

export async function handleSave(): Promise<void> {
  try {
    const authPath = getAuthPath();
    const authsPath = getAuthsPath();

    if (!fileExists(authPath)) {
      console.error(chalk.red("Error: auth.json not found in ~/.codex/"));
      process.exit(1);
    }

    const authData = readAuthData(authPath);

    if (!authData.tokens || !authData.tokens.id_token) {
      console.error(chalk.red("Error: Invalid auth.json format"));
      process.exit(1);
    }

    const payload = decodeJWT(authData.tokens.id_token);
    const email = payload.email;

    if (!email) {
      console.error(chalk.red("Error: Could not extract email from token"));
      process.exit(1);
    }

    const authsData = readAuthsData(authsPath);
    const existingAuth = authsData[email]?.auth;
    const { auth: selectedAuth } = selectLatestAuth(authData, existingAuth);

    // Create account entry with default rate limits
    authsData[email] = {
      auth: selectedAuth,
      metadata: {
        rate_limits: {
          primary: {
            used_percent: 0,
            window_minutes: 300,
            resets_at: Math.floor(Date.now() / 1000) + 300 * 60
          },
          secondary: {
            used_percent: 0,
            window_minutes: 10080,
            resets_at: Math.floor(Date.now() / 1000) + 10080 * 60
          },
          credits: {
            has_credits: false,
            unlimited: false,
            balance: null
          },
          plan_type: "unknown"
        },
        last_updated: 0  // Set to 0 to force update
      }
    };

    // Try to fetch real rate limits
    const spinner = ora("Fetching rate limits...").start();
    const { rateLimits } = await fetchRateLimitWithAuth(authsData[email].auth, { allowRefresh: false });

    if (rateLimits) {
      authsData[email].metadata.rate_limits = rateLimits;
      authsData[email].metadata.last_updated = Math.floor(Date.now() / 1000);
      spinner.succeed("Rate limits fetched");
    } else {
      spinner.warn("Could not fetch rate limits (will retry on next list)");
    }

    writeAuthsData(authsPath, authsData);

    console.log(chalk.green(`✓ Saved auth for ${email}`));
  } catch (error) {
    console.error(chalk.red("Error:"), (error as Error).message);
    process.exit(1);
  }
}
