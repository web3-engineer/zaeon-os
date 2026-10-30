import { spawnSync } from "node:child_process";
const runner = process.argv.includes("--compare-memory")
  ? "./transfer-runner.ts"
  : "./evaluate-runner.ts";
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    new URL(runner, import.meta.url).pathname,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
