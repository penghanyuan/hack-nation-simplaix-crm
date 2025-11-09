import { db } from '@/db';
import { deals, type Deal, type NewDeal } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

type DealUpdate = Partial<Omit<NewDeal, 'id'>>;

export async function listDeals(): Promise<Deal[]> {
  return db
    .select()
    .from(deals)
    .orderBy(desc(deals.createdAt));
}

export async function createDeal(data: DealUpdate): Promise<Deal> {
  const [deal] = await db
    .insert(deals)
    .values(data as NewDeal)
    .returning();

  return deal;
}

export async function getDealById(id: string): Promise<Deal | undefined> {
  return db.query.deals.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

export async function updateDeal(id: string, data: DealUpdate): Promise<Deal | undefined> {
  const [deal] = await db
    .update(deals)
    .set({
      ...data,
      updatedAt: data.updatedAt ?? new Date(),
    })
    .where(eq(deals.id, id))
    .returning();

  return deal;
}

export async function deleteDeal(id: string): Promise<Deal | undefined> {
  const [deal] = await db
    .delete(deals)
    .where(eq(deals.id, id))
    .returning();

  return deal;
}

