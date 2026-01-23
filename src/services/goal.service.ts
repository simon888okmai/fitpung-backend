// src/services/goal.service.ts
import { db } from '../db';
import { weeklyGoals } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const updateWeeklyGoalProgress = async (userId: number, distance: number) => {
    // 1. คำนวณวันจันทร์-อาทิตย์ (Logic เดิมที่เคยรกอยู่ใน route)
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

    const startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // 2. ค้นหา Goal
    const currentGoal = await db.query.weeklyGoals.findFirst({
        where: and(
            eq(weeklyGoals.userId, userId),
            gte(weeklyGoals.startDate, startDate),
            lte(weeklyGoals.startDate, endDate)
        )
    });

    // 3. ถ้ามี Goal -> อัปเดต
    if (currentGoal) {
        await db.update(weeklyGoals)
            .set({
                currentKm: sql`${weeklyGoals.currentKm} + ${distance}`
            })
            .where(eq(weeklyGoals.id, currentGoal.id));

        console.log(`✅ Updated Goal for user ${userId}: +${distance}km`);
        return true; // บอกว่าอัปเดตสำเร็จ
    }

    return false; // ไม่มีการอัปเดต (อาจจะเพราะไม่มี Goal)
};