import chalk from "chalk";
import prompts from "prompts";
import { getAuthsPath } from "../utils/paths.js";
import { readAuthsData, writeAuthsData, fileExists } from "../utils/file.js";

export async function handleNote(email?: string, options?: { add?: boolean; delete?: boolean }): Promise<void> {
  try {
    const authsPath = getAuthsPath();

    if (!fileExists(authsPath)) {
      console.log(chalk.yellow("No saved accounts found."));
      return;
    }

    const authsData = readAuthsData(authsPath);
    const emails = Object.keys(authsData);

    if (emails.length === 0) {
      console.log(chalk.yellow("No saved accounts found."));
      return;
    }

    // If no email provided, prompt user to select
    let selectedEmail = email;
    if (!selectedEmail) {
      const choices = emails.map((e, index) => ({
        title: `${index + 1}) ${e}`,
        value: e
      }));

      const response = await prompts({
        type: "select",
        name: "email",
        message: "Select an account:",
        choices
      });

      if (!response.email) {
        console.log(chalk.yellow("No account selected."));
        return;
      }

      selectedEmail = response.email;
    }

    const account = authsData[selectedEmail];
    if (!account) {
      console.log(chalk.red(`Account not found: ${selectedEmail}`));
      return;
    }

    // Delete note
    if (options?.delete) {
      if (account.metadata.notes) {
        delete account.metadata.notes;
        writeAuthsData(authsPath, authsData);
        console.log(chalk.green(`Note deleted for ${selectedEmail}`));
      } else {
        console.log(chalk.yellow(`No note found for ${selectedEmail}`));
      }
      return;
    }

    // Add or edit note
    const currentNote = account.metadata.notes || "";
    const action = currentNote ? "Edit" : "Add";

    const response = await prompts({
      type: "text",
      name: "note",
      message: `${action} note for ${selectedEmail}:`,
      initial: currentNote
    });

    if (response.note === undefined) {
      console.log(chalk.yellow("Operation cancelled."));
      return;
    }

    if (response.note.trim() === "") {
      delete account.metadata.notes;
      console.log(chalk.green(`Note removed for ${selectedEmail}`));
    } else {
      account.metadata.notes = response.note.trim();
      console.log(chalk.green(`Note ${currentNote ? "updated" : "added"} for ${selectedEmail}`));
    }

    writeAuthsData(authsPath, authsData);
  } catch (error) {
    console.error(chalk.red("Error:"), (error as Error).message);
    process.exit(1);
  }
}
