import chalk from "chalk";
import ora from "ora";
import { getAuthPath, getAuthsPath } from "../utils/paths.js";
import { readAuthData, readAuthsData, writeAuthsData, fileExists } from "../utils/file.js";
import { shouldUpdateRateLimit } from "../utils/cache.js";
import { formatTimeUntil } from "../utils/time.js";
import { safeDecodeJWT } from "../utils/jwt.js";
import { selectLatestAuth } from "../utils/auth.js";
import { fetchRateLimitWithAuth } from "../services/rateLimit.js";
import type { AuthData } from "../types/index.js";

export async function handleList(): Promise<void> {
  try {
    const authPath = getAuthPath();
    const authsPath = getAuthsPath();

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

    if (!fileExists(authsPath)) {
      console.log(chalk.yellow("No saved accounts found."));
      return;
    }

    let authsData = readAuthsData(authsPath);
    const emails = Object.keys(authsData);

    if (emails.length === 0) {
      console.log(chalk.yellow("No saved accounts found."));
      return;
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

    // Display accounts in table form
    const formatUsage = (used: number | undefined, resetAt?: number | null) => {
      if (typeof used !== "number") {
        return "-";
      }
      const resetText = resetAt ? formatTimeUntil(resetAt) : "?";
      return `${used}% ${chalk.dim(`(${resetText})`)}`;
    };

    const rows = emails.map((email, index) => {
      const account = authsData[email];
      const rateLimits = account?.metadata?.rate_limits;
      const planType = rateLimits?.plan_type || "unknown";
      const notes = account?.metadata?.notes || "";

      return {
        index: `${index + 1})`,
        active: activeEmail === email ? "*" : "",
        email,
        plan: planType,
        primaryUsed: formatUsage(rateLimits?.primary?.used_percent, rateLimits?.primary?.resets_at),
        secondaryUsed: formatUsage(rateLimits?.secondary?.used_percent, rateLimits?.secondary?.resets_at),
        notes: notes.length > 30 ? notes.substring(0, 30) + "..." : notes
      };
    });

    const columns = [
      { key: "index", header: "#" },
      { key: "active", header: "active" },
      { key: "email", header: "email" },
      { key: "plan", header: "type" },
      { key: "primaryUsed", header: "5h used" },
      { key: "secondaryUsed", header: "weekly used" },
      { key: "notes", header: "notes" }
    ] as const;

    const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

    const widths = columns.reduce<Record<string, number>>((acc, column) => {
      const maxCell = rows.reduce((max, row) => {
        const value = String(row[column.key] ?? "");
        return Math.max(max, stripAnsi(value).length);
      }, column.header.length);
      acc[column.key] = maxCell;
      return acc;
    }, {});

    const pad = (value: string, width: number) => {
      const visible = stripAnsi(value).length;
      const padding = Math.max(0, width - visible);
      return `${value}${" ".repeat(padding)}`;
    };

    const headerLine = columns
      .map((column) => pad(column.header, widths[column.key]))
      .join("  ");
    const dividerLine = "-".repeat(headerLine.length);

    console.log(chalk.bold(`Saved accounts (${emails.length}):`));
    console.log(chalk.dim(headerLine));
    console.log(chalk.dim(dividerLine));

    rows.forEach((row) => {
      const line = columns
        .map((column) => pad(String(row[column.key] ?? ""), widths[column.key]))
        .join("  ");
      console.log(line);
    });
  } catch (error) {
    console.error(chalk.red("Error:"), (error as Error).message);
    process.exit(1);
  }
}
