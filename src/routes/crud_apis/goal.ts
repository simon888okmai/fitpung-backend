import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { weeklyGoals, activities } from '../../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const goalRoutes = new Elysia()
    .use(authMiddleware)
    .group('/goals', (app) => app
        .get('/current', async ({ user, set }) => {
            try {
                const userId = Number(user.id);

                const now = new Date();
                const currentDay = now.getDay();
                const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

                const startDate = new Date(now.setDate(diff));
                startDate.setHours(0, 0, 0, 0);

                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);

                const activeGoal = await db.query.weeklyGoals.findFirst({
                    where: and(
                        eq(weeklyGoals.userId, userId),
                        gte(weeklyGoals.startDate, startDate),
                        lte(weeklyGoals.startDate, endDate)
                    ),
                    orderBy: [desc(weeklyGoals.createdAt)]
                });

                if (!activeGoal) {
                    return { hasGoal: false, data: null };
                }

                const activitiesList = await db.query.activities.findMany({
                    where: and(
                        eq(activities.userId, userId),
                        gte(activities.startTime, activeGoal.startDate),
                        lte(activities.startTime, activeGoal.endDate)
                    )
                });

                let totalDuration = 0;
                let totalDistance = 0;
                let totalCalories = 0;

                const dailyDistance: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

                activitiesList.forEach(act => {
                    totalDuration += act.duration || 0;
                    totalDistance += act.distance || 0;
                    totalCalories += act.calories || 0;

                    if (act.startTime) {
                        const date = new Date(act.startTime);
                        const day = date.getDay();
                        dailyDistance[day] += act.distance || 0;
                    }
                });

                const avgPace = totalDistance > 0 ? (totalDuration / 60) / totalDistance : 0;

                const graphData = [
                    { day: 'M', value: Math.round((dailyDistance[1] || 0) * 10) / 10 },
                    { day: 'T', value: Math.round((dailyDistance[2] || 0) * 10) / 10 },
                    { day: 'W', value: Math.round((dailyDistance[3] || 0) * 10) / 10 },
                    { day: 'T', value: Math.round((dailyDistance[4] || 0) * 10) / 10 },
                    { day: 'F', value: Math.round((dailyDistance[5] || 0) * 10) / 10 },
                    { day: 'S', value: Math.round((dailyDistance[6] || 0) * 10) / 10 },
                    { day: 'S', value: Math.round((dailyDistance[0] || 0) * 10) / 10 }
                ];

                const responseData = {
                    ...activeGoal,
                    duration: totalDuration,
                    avgPace: Math.round(avgPace * 10) / 10,
                    burn: totalCalories,
                    graphData
                };

                return { hasGoal: true, data: responseData };

            } catch (error) {
                console.error(error);
                set.status = 500;
                return { status: 'error', message: 'Internal Server Error' };
            }
        })

        .post('/', async ({ body, user, set }) => {
            try {
                const userId = Number(user.id);
                const { target } = body;

                const now = new Date();
                const currentDay = now.getDay();
                const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

                const startDate = new Date(now.setDate(diff));
                startDate.setHours(0, 0, 0, 0);

                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);

                const existingGoal = await db.query.weeklyGoals.findFirst({
                    where: and(
                        eq(weeklyGoals.userId, userId),
                        gte(weeklyGoals.startDate, startDate),
                        lte(weeklyGoals.startDate, endDate)
                    )
                });

                if (existingGoal) {
                    const updated = await db.update(weeklyGoals)
                        .set({ targetKm: target })
                        .where(eq(weeklyGoals.id, existingGoal.id))
                        .returning();

                    return { status: 'success', action: 'updated', data: updated[0] };
                }

                const newGoal = await db.insert(weeklyGoals).values({
                    userId,
                    targetKm: target,
                    currentKm: 0,
                    startDate,
                    endDate,
                    status: 'ACTIVE'
                }).returning();

                return { status: 'success', action: 'created', data: newGoal[0] };

            } catch (error) {
                console.error(error);
                set.status = 500;
                return { status: 'error', message: 'Could not create goal' };
            }
        }, {
            body: t.Object({
                target: t.Numeric()
            })
        })
    );