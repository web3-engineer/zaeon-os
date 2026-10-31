import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export const JADX_SHA256 =
  "6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75";
export async function qualifyAndroid({
  jar = process.env.REA_JADX_MCP_JAR,
  expectedHash = JADX_SHA256,
  probe = async (cmd, args) =>
    (await exec(cmd, args, { timeout: 15000 })).stdout,
} = {}) {
  const checks = { jar: false, compiler: false, ps: false, rea: false };
  const details = {};
  try {
    details.jarSha256 = createHash("sha256")
      .update(await readFile(jar))
      .digest("hex");
    checks.jar = details.jarSha256 === expectedHash;
  } catch {
    details.jar = "missing_or_unreadable";
  }
  for (const [key, cmd, args] of [
    ["compiler", "java", ["--list-modules"]],
    ["ps", "ps", ["-p", String(process.pid)]],
    ["rea", "rea", ["--version"]],
  ]) {
    try {
      const text = await probe(cmd, args);
      details[key] = text.trim().slice(0, 500);
      checks[key] =
        key === "compiler"
          ? /jdk.compiler@/.test(text)
          : key === "rea"
            ? /6\.5\.0/.test(text)
            : true;
    } catch {
      details[key] = "unavailable";
    }
  }
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    details,
    kind: "engine_readiness",
    targetExecution: false,
  };
}
