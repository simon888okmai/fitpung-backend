import { db } from '../db';
import { weeklyGoals } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const updateWeeklyGoalProgress = async (userId: number, distance: number) => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentDay = thaiTime.getUTCDay();
    const diff = thaiTime.getUTCDate() - currentDay + (currentDay === 0 ? -6 : 1);

    const startDate = new Date(Date.UTC(
        thaiTime.getUTCFullYear(),
        thaiTime.getUTCMonth(),
        diff,
        0, 0, 0, 0
    ) - (7 * 60 * 60 * 1000));

    const endDate = new Date(Date.UTC(
        thaiTime.getUTCFullYear(),
        thaiTime.getUTCMonth(),
        diff + 6,
        23, 59, 59, 999
    ) - (7 * 60 * 60 * 1000));

    const currentGoal = await db.query.weeklyGoals.findFirst({
        where: and(
            eq(weeklyGoals.userId, userId),
            gte(weeklyGoals.startDate, startDate),
            lte(weeklyGoals.startDate, endDate)
        )
    });

    if (currentGoal) {
        await db.update(weeklyGoals)
            .set({
                currentKm: sql`${weeklyGoals.currentKm} + ${distance}`
            })
            .where(eq(weeklyGoals.id, currentGoal.id));

        console.log(`✅ Updated Goal for user ${userId}: +${distance}km`);
        return true;
    }

    return false;
};