import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  let envFile;
  try {
    envFile = readFileSync(resolve(root, ".env.local"), "utf8");
  } catch {
    throw new Error("DATABASE_URL is missing. Set it in the environment or .env.local.");
  }

  const line = envFile.split(/\r?\n/).find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
  if (!line) throw new Error("DATABASE_URL is missing. Set it in the environment or .env.local.");

  let value = line.slice(line.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.trim();
}

const databaseUrl = readDatabaseUrl();
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
}

const cli = resolve(root, "node_modules/supabase/dist/supabase.js");
const child = spawn(process.execPath, [cli, "db", "push", "--yes", `--remote=${databaseUrl}`], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(`Could not start Supabase CLI: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
