import { Command } from "commander";
import { handleSave } from "./commands/save.js";
import { handleLoad } from "./commands/load.js";
import { handleList } from "./commands/list.js";
import { handleDelete, handleDeleteAll } from "./commands/delete.js";
import { handleNote } from "./commands/note.js";

const VERSION = "0.1.0";

export async function run(): Promise<void> {
  const program = new Command();

  program
    .name("cotate")
    .description("CLI tool for managing authentication configurations")
    .version(VERSION, "-v, --version", "Show version number");

  program
    .command("save")
    .description("Save current configuration or state")
    .action(async () => {
      await handleSave();
    });

  program
    .command("load")
    .description("Load saved configuration or state")
    .action(async () => {
      await handleLoad();
    });

  program
    .command("list")
    .aliases(["show", "ls"])
    .description("List all saved items")
    .action(async () => {
      await handleList();
    });

  program
    .command("delete")
    .description("Delete a saved account")
    .action(async () => {
      await handleDelete();
    });

  program
    .command("delete-all")
    .description("Delete all saved accounts")
    .action(async () => {
      await handleDeleteAll();
    });

  program
    .command("note [email]")
    .description("Add or edit note for an account")
    .option("-d, --delete", "Delete note for the account")
    .action(async (email, options) => {
      await handleNote(email, options);
    });

  await program.parseAsync(process.argv);
}
