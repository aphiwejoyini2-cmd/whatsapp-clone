const USERNAME_PATTERN = /^(?=.{3,30}$)(?!.*\.\.)[a-z0-9](?:[a-z0-9._]*[a-z0-9])$/;

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value);
}

// Supabase Auth signs in with email/password, so usernames map to a private,
// non-deliverable email identity. The app never displays or emails this address.
export function usernameAuthEmail(username: string) {
  return `${normalizeUsername(username)}@users.lingo.invalid`;
}
