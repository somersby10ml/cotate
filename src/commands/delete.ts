import chalk from "chalk";
import prompts from "prompts";
import fs from "fs";
import { getAuthsPath } from "../utils/paths.js";
import { readAuthsData, writeAuthsData, fileExists } from "../utils/file.js";

export async function handleDelete(): Promise<void> {
  try {
    const authsPath = getAuthsPath();

    if (!fileExists(authsPath)) {
      console.error(chalk.red("Error: No saved accounts found."));
      process.exit(1);
    }

    const authsData = readAuthsData(authsPath);
    const emails = Object.keys(authsData);

    if (emails.length === 0) {
      console.error(chalk.red("Error: No saved accounts found."));
      process.exit(1);
    }

    const choices = emails.map((email) => {
      const metadata = authsData[email]?.metadata;
      const planType = metadata?.rate_limits?.plan_type || "unknown";

      return {
        title: `${email} (${planType})`,
        value: email
      };
    });

    const response = await prompts({
      type: "select",
      name: "email",
      message: "Select an account to delete:",
      choices: choices,
      initial: 0
    });

    if (!response.email) {
      console.log(chalk.yellow("Cancelled."));
      process.exit(0);
    }

    const selectedEmail = response.email;

    const confirm = await prompts({
      type: "confirm",
      name: "value",
      message: `Are you sure you want to delete ${chalk.cyan(selectedEmail)}?`,
      initial: false
    });

    if (!confirm.value) {
      console.log(chalk.yellow("Cancelled."));
      process.exit(0);
    }

    delete authsData[selectedEmail];

    if (Object.keys(authsData).length === 0) {
      fs.unlinkSync(authsPath);
      console.log(chalk.green(`✓ Deleted ${selectedEmail} and removed empty _auths.json`));
    } else {
      writeAuthsData(authsPath, authsData);
      console.log(chalk.green(`✓ Deleted ${selectedEmail}`));
    }
  } catch (error) {
    console.error(chalk.red("Error:"), (error as Error).message);
    process.exit(1);
  }
}

export async function handleDeleteAll(): Promise<void> {
  try {
    const authsPath = getAuthsPath();

    if (!fileExists(authsPath)) {
      console.log(chalk.yellow("No saved accounts to delete."));
      return;
    }

    const authsData = readAuthsData(authsPath);
    const count = Object.keys(authsData).length;

    const confirm = await prompts({
      type: "confirm",
      name: "value",
      message: `Are you sure you want to delete ${chalk.red(`ALL ${count} account(s)`)}? This cannot be undone.`,
      initial: false
    });

    if (!confirm.value) {
      console.log(chalk.yellow("Cancelled."));
      process.exit(0);
    }

    fs.unlinkSync(authsPath);
    console.log(chalk.green(`✓ Deleted all ${count} account(s)`));
  } catch (error) {
    console.error(chalk.red("Error:"), (error as Error).message);
    process.exit(1);
  }
}
