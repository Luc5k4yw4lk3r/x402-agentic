---
name: ts-hello-world
description: Fetches Charmander from the PokeAPI in TypeScript and prints a readable summary. Use in OpenClaw when the user asks for PokeAPI, Charmander, or a TypeScript fetch demo against https://pokeapi.co/api/v2/pokemon/charmander.
---

# TypeScript + PokeAPI (Charmander)

OpenClaw resolves relative paths in this skill against the skill folder (directory that contains this `SKILL.md`). Use that absolute base when running shell commands.

## Default workflow

1. Run the bundled script with **network access** (it calls the public PokeAPI).
2. **Prefer**: `npx --yes tsx scripts/hello.ts` from the skill directory.
   - Requires Node 18+ (built-in `fetch`).

## What the script does

- `GET https://pokeapi.co/api/v2/pokemon/charmander`
- Prints: id, name, types, height/weight (SI), abilities, base stats, and the URL.

## Bundled script

[scripts/hello.ts](scripts/hello.ts):

```bash
npx --yes tsx scripts/hello.ts
```

## If `tsx` is unavailable

- **Deno**: `deno run --allow-net scripts/hello.ts`
- **Node 22+** (strip types): only if the file is valid for `--experimental-strip-types` (this script is).

To change the Pokémon, edit the `url` constant in `hello.ts` (e.g. `/pokemon/pikachu`).
