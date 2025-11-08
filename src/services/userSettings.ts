import { db } from '@/db';
import { userSettings, type UserSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_USER_ID = 'default';

type UserSettingsInsert = typeof userSettings.$inferInsert;

type UpdatableUserSettings = Partial<Omit<UserSettingsInsert, 'userId'>>;

export async function getUserSettings(userId: string = DEFAULT_USER_ID): Promise<UserSettings | undefined> {
  return db.query.userSettings.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
  });
}

async function createUserSettings(userId: string, data: UpdatableUserSettings) {
  const now = new Date();
  const [record] = await db
    .insert(userSettings)
    .values({
      userId,
      ...data,
      updatedAt: data.updatedAt ?? now,
    })
    .returning();

  return record;
}

async function updateUserSettings(userId: string, data: UpdatableUserSettings) {
  const [record] = await db
    .update(userSettings)
    .set({
      ...data,
      updatedAt: data.updatedAt ?? new Date(),
    })
    .where(eq(userSettings.userId, userId))
    .returning();

  return record;
}

async function upsertUserSettings(userId: string, data: UpdatableUserSettings) {
  const existing = await getUserSettings(userId);
  return existing
    ? updateUserSettings(userId, data)
    : createUserSettings(userId, data);
}

export async function saveGmailTokens(userId: string, params: {
  accessToken: string;
  refreshToken?: string | null;
  expiry: Date;
}) {
  const existing = await getUserSettings(userId);
  return existing
    ? updateUserSettings(userId, {
        gmailAccessToken: params.accessToken,
        gmailRefreshToken: params.refreshToken ?? existing.gmailRefreshToken,
        gmailTokenExpiry: params.expiry,
      })
    : createUserSettings(userId, {
        gmailAccessToken: params.accessToken,
        gmailRefreshToken: params.refreshToken ?? undefined,
        gmailTokenExpiry: params.expiry,
      });
}

export async function updateLastGmailSync(userId: string, date: Date = new Date()) {
  return upsertUserSettings(userId, {
    lastGmailSync: date,
  });
}

export async function updateLastActivitySync(userId: string, date: Date = new Date()) {
  return upsertUserSettings(userId, {
    lastActivitySync: date,
  });
}

export async function ensureUserSettings(userId: string = DEFAULT_USER_ID) {
  const existing = await getUserSettings(userId);
  if (existing) return existing;
  return createUserSettings(userId, {});
}
