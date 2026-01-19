# cotate

CLI tool for managing authentication configurations. Built for Bun (not published to npm).

## Requirements
- Bun

## Quick start (Bun)

Install dependencies:
```bash
bun install
```

Run immediately:
```bash
bun run src/index.ts
```

Or use the script:
```bash
bun run start
```

## Commands (cotate)

You can run commands via Bun:
```bash
bun run src/index.ts <command>
```

Available commands (CLI name: `cotate`):
- `cotate save` — Save current configuration or state
- `cotate load` — Load saved configuration or state
- `cotate list` (alias: `show`) — List all saved items
- `cotate delete` — Delete a saved account
- `cotate delete-all` — Delete all saved accounts
- `cotate -v` / `--version` — Show version number

Examples with Bun:
```bash
bun run src/index.ts save
bun run src/index.ts list
bun run src/index.ts delete
```

Help:
```bash
bun run src/index.ts --help
```
