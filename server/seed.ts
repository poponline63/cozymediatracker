/**
 * Seed script — creates a pre-verified test account.
 * Run once: npx tsx server/seed.ts
 *
 * Test credentials:
 *   username: testuser
 *   password: Test1234!
 */

import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  const TEST_USERNAME = "testuser";
  const TEST_PASSWORD = "Test1234!";
  const TEST_EMAIL = "test@cozywatch.local";

  console.log("🌱 Seeding test account...");

  const [existing] = await db.select().from(users).where(eq(users.username, TEST_USERNAME));
  if (existing) {
    console.log(`✅ Test account already exists (id: ${existing.id})`);
    console.log(`   username: ${TEST_USERNAME}`);
    console.log(`   password: ${TEST_PASSWORD}`);
    process.exit(0);
  }

  const [user] = await db.insert(users).values({
    username: TEST_USERNAME,
    password: await hashPassword(TEST_PASSWORD),
    email: TEST_EMAIL,
    emailVerified: true, // Pre-verified — no email needed
    avatarUrl: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=testuser",
    preferences: { theme: "dark", viewMode: "grid", notifications: true },
  }).returning();

  console.log(`\n✅ Test account created!`);
  console.log(`   id:       ${user.id}`);
  console.log(`   username: ${TEST_USERNAME}`);
  console.log(`   password: ${TEST_PASSWORD}`);
  console.log(`\n🔐 Login at /auth with these credentials.\n`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
