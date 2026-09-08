import { renameSync, existsSync, rmSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";

const rootDir = process.cwd();
const apiDir = resolve(rootDir, "src/app/api");
const tempDir = resolve(rootDir, "src/_api_temp");
const nextDir = resolve(rootDir, ".next");
const outDir = resolve(rootDir, "out");

console.log("[build-export] Starting static export build for Tauri...");

let moved = false;
try {
  if (existsSync(apiDir)) {
    console.log("[build-export] Temporarily moving src/app/api to src/_api_temp...");
    renameSync(apiDir, tempDir);
    moved = true;
  }

  if (existsSync(nextDir)) {
    console.log("[build-export] Cleaning .next cache...");
    rmSync(nextDir, { recursive: true, force: true });
  }

  console.log("[build-export] Running next build with NEXT_EXPORT=true...");
  const result = spawnSync("npx", ["next", "build"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXT_EXPORT: "true" }
  });

  if (result.status !== 0) {
    console.error(`[build-export] next build failed with exit code ${result.status}`);
    process.exitCode = result.status || 1;
  } else {
    console.log("[build-export] next build static export completed successfully.");
  }
} catch (err) {
  console.error("[build-export] Error during export build:", err);
  process.exitCode = 1;
} finally {
  if (moved && existsSync(tempDir)) {
    console.log("[build-export] Restoring src/app/api...");
    let retries = 5;
    while (retries > 0) {
      try {
        renameSync(tempDir, apiDir);
        console.log("[build-export] src/app/api restored.");
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.error("[build-export] Failed to restore src/app/api:", err);
        } else {
          spawnSync(process.platform === "win32" ? "timeout" : "sleep", process.platform === "win32" ? ["/t", "1"] : ["1"], { shell: true });
        }
      }
    }
  }
}

if (!existsSync(outDir)) {
  console.error("[build-export] Error: 'out' directory was not generated!");
  process.exit(1);
}

console.log("[build-export] Static export verified at:", outDir);
