import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { usersProfile, weeklyGoals, activities, shoes } from '../../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const homeRoutes = new Elysia()
    .use(authMiddleware)
    .group('/home', (app) => app
        .get('/', async ({ set, user }) => {
            try {
                const userId = Number(user.id);

                // --- 1. เตรียมวันเวลา ---
                const now = new Date();
                const currentDay = now.getDay();
                const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

                const startDate = new Date(now.setDate(diff)); startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23, 59, 59, 999);

                // --- 2. Query ข้อมูลพร้อมกัน ---
                const [profile, currentGoal, lastActivity, defaultShoe] = await Promise.all([
                    db.query.usersProfile.findFirst({
                        where: eq(usersProfile.userId, userId),
                        columns: { name: true }
                    }),
                    db.query.weeklyGoals.findFirst({
                        where: and(
                            eq(weeklyGoals.userId, userId),
                            gte(weeklyGoals.startDate, startDate),
                            lte(weeklyGoals.startDate, endDate)
                        )
                    }),
                    db.query.activities.findFirst({
                        where: eq(activities.userId, userId),
                        orderBy: [desc(activities.startTime)],
                    }),
                    db.query.shoes.findFirst({
                        where: and(
                            eq(shoes.userId, userId),
                            eq(shoes.isDefault, true)
                        )
                    })
                ]);

                // --- 3. จัด Format ---
                return {
                    status: 'success',
                    data: {
                        user: {
                            name: profile?.name || 'Runner',
                        },
                        weeklyGoal: currentGoal ? {
                            current: currentGoal.currentKm,
                            target: currentGoal.targetKm,
                            streak: 0,
                            unit: "km"
                        } : null,
                        lastRun: lastActivity ? {
                            date: lastActivity.startTime,
                            distance: lastActivity.distance,
                            duration: lastActivity.duration,
                            pace: lastActivity.pace,
                            calories: lastActivity.calories
                        } : null,
                        activeShoe: defaultShoe ? {
                            name: `${defaultShoe.brand} ${defaultShoe.model}`,
                            currentDistance: defaultShoe.currentDistance,
                            maxDistance: defaultShoe.maxDistance
                        } : null
                    }
                };

            } catch (error) {
                console.error(error);
                set.status = 500;
                return { error: 'Failed to fetch homepage data' };
            }
        })
    );