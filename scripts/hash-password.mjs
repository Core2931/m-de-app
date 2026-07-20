import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
// Next.js's .env parser treats `$` as variable interpolation, which corrupts
// a raw bcrypt hash (it's full of `$2b$10$...`). Escape it before pasting.
const escaped = hash.replace(/\$/g, "\\$");

console.log(`APP_PASSWORD_HASH=${escaped}`);
