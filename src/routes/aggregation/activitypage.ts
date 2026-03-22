import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { db } from '../../db';
import { activities, weeklyGoals, userBadges, badges, usersProfile } from '../../db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

export const activityPageRoute = new Elysia()
    .use(authMiddleware)
    .group('/stats', (app) => app
        .get('/', async ({ query, set, user }) => {
            const userId = Number(user.id);
            const month = Number(query.month);
            const year = Number(query.year);

            if (!month || !year) {
                set.status = 400;
                return { error: 'Month and year are required' };
            }

            try {
                const profile = await db.query.usersProfile.findFirst({
                    where: eq(usersProfile.userId, userId)
                });

                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);

                const monthlyActivities = await db.query.activities.findMany({
                    where: and(
                        eq(activities.userId, userId),
                        gte(activities.startTime, startDate),
                        lte(activities.startTime, endDate)
                    ),
                    orderBy: [desc(activities.startTime)]
                });

                const totalDistance = monthlyActivities.reduce((sum, act) => sum + act.distance, 0);
                const totalDuration = monthlyActivities.reduce((sum, act) => sum + act.duration, 0);
                const totalCalories = monthlyActivities.reduce((sum, act) => sum + act.calories, 0);

                const runDays = [...new Set(monthlyActivities.map(act => {
                    return act.startTime ? new Date(act.startTime).getDate() : null
                }))].filter(d => d !== null).sort((a, b) => (a || 0) - (b || 0));

                const streak = 3;

                const activeGoal = await db.query.weeklyGoals.findFirst({
                    where: and(eq(weeklyGoals.userId, userId), eq(weeklyGoals.status, 'ACTIVE')),
                    orderBy: [desc(weeklyGoals.createdAt)]
                });

                const myBadgeCount = (await db.select({ count: sql<number>`count(*)` })
                    .from(userBadges).where(eq(userBadges.userId, userId)))[0].count;
                const totalBadgeCount = (await db.select({ count: sql<number>`count(*)` })
                    .from(badges))[0].count;

                const recentRuns = monthlyActivities.slice(0, 5).map(run => {
                    return {
                        id: `run-${run.id}`,
                        timestamp: run.startTime,
                        distance: Number(run.distance.toFixed(2)),
                        duration: run.duration,
                        pace: run.pace || (run.distance > 0 ? (run.duration / 60) / run.distance : 0),
                        kcal: run.calories
                    };
                });

                return {
                    user: {
                        name: profile?.name || "Runner",
                    },
                    summary: {
                        streak: streak,
                        totalDistance: Number(totalDistance.toFixed(2)),
                        totalTime: totalDuration,
                        totalCalories: totalCalories,
                        runDays: runDays,
                    },
                    cards: {
                        weeklyGoal: {
                            current: activeGoal ? (activeGoal.currentKm || 0) : 0,
                            target: activeGoal ? activeGoal.targetKm : 100,
                            unit: "km",
                            status: activeGoal && (activeGoal.currentKm || 0) >= activeGoal.targetKm ? "Completed" : "On Track",
                        },
                        badges: {
                            unlocked: Number(myBadgeCount),
                            total: Number(totalBadgeCount),
                        }
                    },
                    recentRuns: recentRuns
                };

            } catch (error) {
                console.error(error);
                set.status = 500;
                return { error: 'Failed to fetch stats' };
            }
        })
    );
