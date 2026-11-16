import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing from the environment and .env.local.");
  process.exit(1);
}

let host;
try {
  host = new URL(connectionString).hostname;
} catch {
  console.error("DATABASE_URL is not a valid PostgreSQL URL.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 10000, max: 1 });
try {
  const client = await pool.connect();
  try {
    await client.query("select 1");
    console.log(`Database connection successful (${host}); SELECT 1 succeeded.`);
  } finally {
    client.release();
  }
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
  const summary = code === "ENOTFOUND" || code === "EAI_AGAIN"
    ? "hostname could not be resolved"
    : code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "CONNECT_TIMEOUT"
      ? "connection was refused or timed out"
      : code === "28P01" || code === "3D000"
        ? "database authentication or database name was rejected"
        : "connection failed; check the database URL and PostgreSQL server settings";
  console.error(`Database connection failed (${host}): ${summary} [${code}].`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
