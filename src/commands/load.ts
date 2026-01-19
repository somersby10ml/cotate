import chalk from "chalk";
import prompts from "prompts";
import ora from "ora";
import { getAuthPath, getAuthsPath } from "../utils/paths.js";
import { readAuthData, readAuthsData, writeAuthData, writeAuthsData, fileExists } from "../utils/file.js";
import { shouldUpdateRateLimit } from "../utils/cache.js";
import { formatTimeUntil } from "../utils/time.js";
import { safeDecodeJWT } from "../utils/jwt.js";
import { selectLatestAuth } from "../utils/auth.js";
import { fetchRateLimitWithAuth } from "../services/rateLimit.js";
import type { AuthData } from "../types/index.js";

export async function handleLoad(): Promise<void> {
  try {
    const authPath = getAuthPath();
    const authsPath = getAuthsPath();

    if (!fileExists(authsPath)) {
      console.error(chalk.red("Error: No saved accounts found. Run 'save' first."));
      process.exit(1);
    }

    let authsData = readAuthsData(authsPath);
    const emails = Object.keys(authsData);

    if (emails.length === 0) {
      console.error(chalk.red("Error: No saved accounts found. Run 'save' first."));
      process.exit(1);
    }

    let activeEmail: string | null = null;
    let activeAuth: AuthData | null = null;

    if (fileExists(authPath)) {
      try {
        const authData = readAuthData(authPath);
        const payload = authData.tokens?.id_token
          ? safeDecodeJWT(authData.tokens.id_token)
          : null;
        activeEmail = payload?.email ?? null;
        activeAuth = authData;
      } catch (error) {
        activeEmail = null;
        activeAuth = null;
      }
    }

    // Check if any accounts need updating
    const accountsToUpdate = emails.filter((email) => {
      const account = authsData[email];
      return account && shouldUpdateRateLimit(account.metadata?.last_updated);
    });

    // Update rate limits if needed
    if (accountsToUpdate.length > 0) {
      const spinner = ora(`Updating rate limits for ${accountsToUpdate.length} account(s)...`).start();

      for (const [index, email] of accountsToUpdate.entries()) {
        const account = authsData[email];
        if (!account) continue;

        spinner.text = `Updating ${email} (${index + 1}/${accountsToUpdate.length})...`;

        const isActive = !!activeAuth && activeEmail === email;
        let authToUse = account.auth;
        let shouldOverwriteAuth = false;

        if (isActive && activeAuth) {
          const selected = selectLatestAuth(activeAuth, account.auth);
          authToUse = selected.auth;
          shouldOverwriteAuth = selected.fromPreferred;
        }

        const { rateLimits, updatedAuth } = await fetchRateLimitWithAuth(authToUse, {
          allowRefresh: !isActive
        });

        if (isActive && shouldOverwriteAuth) {
          account.auth = authToUse;
        }

        if (!isActive && updatedAuth) {
          account.auth = updatedAuth;
        }

        if (rateLimits) {
          account.metadata.rate_limits = rateLimits;
          account.metadata.last_updated = Math.floor(Date.now() / 1000);
        }

        // Wait 1 second between requests (except for last one)
        if (index < accountsToUpdate.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      writeAuthsData(authsPath, authsData);
      spinner.succeed("Rate limits updated");
      console.log();
    }

    // Build choices with rate limit info
    const choices = emails.map((email) => {
      const account = authsData[email];
      const metadata = account?.metadata;
      const rateLimits = metadata?.rate_limits;
      const planType = rateLimits?.plan_type || "unknown";
      const primaryUsed = rateLimits?.primary?.used_percent || 0;
      const secondaryUsed = rateLimits?.secondary?.used_percent || 0;

      return {
        title: `${email} (${planType}, 5h: ${primaryUsed}%, Week: ${secondaryUsed}%)`,
        value: email
      };
    });

    const response = await prompts({
      type: "select",
      name: "email",
      message: "Select an account to load:",
      choices: choices,
      initial: 0
    });

    if (!response.email) {
      console.log(chalk.yellow("Cancelled."));
      process.exit(0);
    }

    const selectedEmail = response.email;
    const selectedAccount = authsData[selectedEmail];

    if (!selectedAccount) {
      console.error(chalk.red("Error: Selected account not found."));
      process.exit(1);
    }

    writeAuthData(authPath, selectedAccount.auth);

    selectedAccount.metadata.last_updated = Math.floor(Date.now() / 1000);
    writeAuthsData(authsPath, authsData);

    // Display selected account info
    console.log();
    console.log(chalk.green(`✓ Loaded auth for ${chalk.bold(selectedEmail)}`));
    console.log();

    const rateLimits = selectedAccount.metadata?.rate_limits;
    if (rateLimits) {
      console.log(chalk.bold("Account Details:"));
      console.log(`  Plan: ${chalk.blue(rateLimits.plan_type || "unknown")}`);

      // 5-hour limit
      if (rateLimits.primary) {
        const primaryUsed = rateLimits.primary.used_percent || 0;
        const primaryResets = rateLimits.primary.resets_at
          ? formatTimeUntil(rateLimits.primary.resets_at)
          : "unknown";
        console.log(
          `  5-hour limit: ${chalk.magenta(primaryUsed + "%")} used ${chalk.gray(`(resets in ${primaryResets})`)}`
        );
      }

      // Weekly limit
      if (rateLimits.secondary) {
        const secondaryUsed = rateLimits.secondary.used_percent || 0;
        const secondaryResets = rateLimits.secondary.resets_at
          ? formatTimeUntil(rateLimits.secondary.resets_at)
          : "unknown";
        console.log(
          `  Weekly limit: ${chalk.magenta(secondaryUsed + "%")} used ${chalk.gray(`(resets in ${secondaryResets})`)}`
        );
      }

      console.log();
    }
  } catch (error) {
    console.error(chalk.red("Error:"), (error as Error).message);
    process.exit(1);
  }
}
