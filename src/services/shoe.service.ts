// src/services/shoe.service.ts
import { db } from '../db';
import { shoes } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export const updateShoeMileage = async (shoeId: number, distance: number) => {
    // ป้องกันกรณีส่ง shoeId มาเป็น 0 หรือ null
    if (!shoeId) return;

    try {
        // บวกระยะทางเพิ่มเข้าไป (Atomic Update)
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