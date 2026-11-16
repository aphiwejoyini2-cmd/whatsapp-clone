import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const applyChanges = process.argv.includes("--apply");
const authDomain = "users.lingo.invalid";
const usernamePattern = /^(?=.{3,30}$)(?!.*\.\.)[a-z0-9](?:[a-z0-9._]*[a-z0-9])$/;
const phonePattern = /^\+[1-9]\d{7,14}$/;

if (!url || !secretKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local before running this migration.");
}

function normalizeUsername(value) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizePhone(value) {
  return value.trim().replace(/[\s()-]/g, "");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const candidates = [];
let skippedMissingUsername = 0;
let skippedExistingEmail = 0;
let skippedNoPhone = 0;
let existingEmailsWithUsernameAndPhone = 0;
let existingEmailsMissingUsername = 0;
let existingEmailsMissingPhone = 0;

for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw new Error(`Could not list Supabase users: ${error.message}`);
  const users = data.users ?? [];

  for (const user of users) {
    const currentEmail = (user.email ?? "").toLowerCase();
    if (currentEmail.endsWith(`@${authDomain}`)) continue;
    const metadata = user.user_metadata ?? {};
    const rawUsername = typeof metadata.username === "string" ? metadata.username : "";
    const username = normalizeUsername(rawUsername);
    const metadataPhone = typeof metadata.phone_e164 === "string" ? normalizePhone(metadata.phone_e164) : "";
    const authPhone = typeof user.phone === "string" ? normalizePhone(user.phone) : "";
    const phone = phonePattern.test(metadataPhone) ? metadataPhone : authPhone;

    if (currentEmail) {
      skippedExistingEmail += 1;
      if (!usernamePattern.test(username)) existingEmailsMissingUsername += 1;
      if (!phonePattern.test(phone)) existingEmailsMissingPhone += 1;
      if (usernamePattern.test(username) && phonePattern.test(phone)) existingEmailsWithUsernameAndPhone += 1;
      continue;
    }

    if (!usernamePattern.test(username)) {
      skippedMissingUsername += 1;
      continue;
    }

    if (!phonePattern.test(phone)) {
      skippedNoPhone += 1;
      continue;
    }

    candidates.push({
      id: user.id,
      email: `${username}@${authDomain}`,
      metadata: { ...metadata, username, phone_e164: phone },
    });
  }

  if (users.length < 100) break;
}

const counts = new Map();
for (const candidate of candidates) {
  counts.set(candidate.email, (counts.get(candidate.email) ?? 0) + 1);
}
const uniqueCandidates = candidates.filter((candidate) => counts.get(candidate.email) === 1);
const skippedDuplicateUsernames = candidates.length - uniqueCandidates.length;

console.log(`Phone accounts eligible for username login: ${uniqueCandidates.length}`);
console.log(`Skipped because username is missing or invalid: ${skippedMissingUsername}`);
console.log(`Skipped because account already has an email: ${skippedExistingEmail}`);
console.log(`Existing email accounts with username and contact number: ${existingEmailsWithUsernameAndPhone}`);
console.log(`Existing email accounts missing a username: ${existingEmailsMissingUsername}`);
console.log(`Existing email accounts missing a contact number: ${existingEmailsMissingPhone}`);
console.log(`Skipped because no contact number is available: ${skippedNoPhone}`);
console.log(`Skipped because usernames collide after lowercase normalization: ${skippedDuplicateUsernames}`);

if (!applyChanges) {
  console.log("Dry run only. Re-run with --apply to set username login emails; passwords and user IDs are preserved.");
} else {
  let migrated = 0;
  let failed = 0;
  for (const candidate of uniqueCandidates) {
    const { error } = await supabase.auth.admin.updateUserById(candidate.id, {
      email: candidate.email,
      email_confirm: true,
      user_metadata: candidate.metadata,
    });
    if (error) {
      failed += 1;
      console.error(`Could not migrate one account: ${error.message}`);
      continue;
    }
    migrated += 1;
  }

  console.log(`Migrated ${migrated} account(s); ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}
