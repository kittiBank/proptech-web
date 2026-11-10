#!/usr/bin/env node
/**
 * Checks that every mock photo in src/data/images.ts still loads.
 * Run before demos or after editing images.ts: `pnpm check:images`.
 * Not part of CI, so a third-party CDN hiccup never blocks a PR.
 */
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/data/images.ts", import.meta.url), "utf8");
const ids = [...source.matchAll(/unsplash\("([^"]+)"\)/g)].map((m) => m[1]);

if (ids.length === 0) {
  console.error("No unsplash(...) photo ids found in src/data/images.ts");
  process.exit(1);
}

const results = await Promise.all(
  ids.map(async (id) => {
    const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=200&q=40`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      return { id, ok: res.ok, status: res.status };
    } catch (error) {
      return { id, ok: false, status: error instanceof Error ? error.message : String(error) };
    }
  }),
);

const broken = results.filter((r) => !r.ok);
for (const r of broken) console.error(`✗ ${r.status}  photo-${r.id}`);
console.log(`${results.length - broken.length}/${results.length} photos load.`);
process.exit(broken.length > 0 ? 1 : 0);
