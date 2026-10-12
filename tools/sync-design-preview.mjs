// Copy the Companion app unchanged into an already-configured Sites/Vinext
// checkout. GitHub remains the source of truth; the host supplies build tooling.
// Usage: node tools/sync-design-preview.mjs /absolute/preview-checkout
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
if (!target || !path.isAbsolute(target) || path.resolve(target) === app)
  throw Error("An absolute, separate preview checkout is required");
const manifest = path.join(target, ".openai/hosting.json");
if (
  !fs.existsSync(manifest) ||
  !fs.existsSync(path.join(target, "build/sites-worker.ts"))
)
  throw Error("Prepare the supported Sites Vinext host first");
const files = execFileSync(
  "git",
  [
    "ls-files",
    "-z",
    "--",
    "app",
    "src",
    "styles",
    "public",
    "next.config.ts",
    "postcss.config.mjs",
  ],
  { cwd: app, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
// Stage changes before syncing so new components are included in the source snapshot.
const digest = createHash("sha256");
for (const name of ["app", "src", "styles", "public"])
  fs.rmSync(path.join(target, name), { recursive: true, force: true });
for (const name of files) {
  const data = fs.readFileSync(path.join(app, name));
  digest.update(name).update("\0").update(data);
  fs.mkdirSync(path.dirname(path.join(target, name)), { recursive: true });
  fs.writeFileSync(path.join(target, name), data);
}
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: app,
  encoding: "utf8",
}).trim();
const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "."], {
  cwd: app,
  encoding: "utf8",
}).trim();
const provenance = {
  repository: "https://github.com/Jodi1time/dojo-odoo19",
  branch: execFileSync("git", ["branch", "--show-current"], {
    cwd: app,
    encoding: "utf8",
  }).trim(),
  commit,
  dirty,
  sourceSha256: digest.digest("hex"),
  mode: "demo",
  runtime: "Vinext / Cloudflare Workers",
  files,
};
fs.mkdirSync(path.join(target, "public"), { recursive: true });
fs.writeFileSync(
  path.join(target, "public/source.json"),
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log(
  `Copied ${files.length} source files. ${dirty ? "Working tree preview" : "Commit " + commit}.`,
);
