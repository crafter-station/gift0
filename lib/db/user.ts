import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(fingerprintId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.fingerprintId, fingerprintId),
  });

  if (existing) return { user: existing, isNew: false };

  const [newUser] = await db
    .insert(users)
    .values({ fingerprintId })
    .returning();

  return { user: newUser, isNew: true };
}

