import { db } from '@/db';
import { interactions, type Interaction, type NewInteraction } from '@/db/schema';

export async function createInteraction(values: NewInteraction): Promise<Interaction> {
  const [interaction] = await db
    .insert(interactions)
    .values(values)
    .returning();

  return interaction;
}
