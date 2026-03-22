import { db } from '../db';
import { shoes } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export const updateShoeMileage = async (shoeId: number, distance: number) => {
    if (!shoeId) return;

    try {
        await db.update(shoes)
            .set({
                currentDistance: sql`${shoes.currentDistance} + ${distance}`
            })
            .where(eq(shoes.id, shoeId));

        console.log(`👟 Updated Shoe ID ${shoeId}: +${distance}km`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to update shoe ${shoeId}:`, error);
        return false;
    }
};