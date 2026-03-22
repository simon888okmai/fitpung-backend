import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { activities } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { updateWeeklyGoalProgress } from '../../services/goal.service';
import { updateShoeMileage } from '../../services/shoe.service';
import { checkAndUnlockBadges } from '../../services/badge.service';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const activityRoutes = new Elysia()
    .use(authMiddleware)
    .group('/activities', (app) => app
        .post('/', async ({ body, user, set }) => {
            try {
                const userId = Number(user.id);
                const { type, distance, duration, calories, routePath, shoeId, startTime, endTime } = body;

                const newActivity = await db.insert(activities).values({
                    userId,
                    type: type || 'RUN',
                    distance,
                    duration,
                    calories,
                    pace: distance > 0 ? (duration / 60) / distance : 0,
                    routePath,
                    startTime: startTime ? new Date(startTime) : new Date(),
                    endTime: endTime ? new Date(endTime) : undefined,
                    shoeId: shoeId || null,
                }).returning();

                await updateWeeklyGoalProgress(userId, distance);

                if (shoeId) {
                    await updateShoeMileage(shoeId, distance);
                }

                const unlockedBadges = await checkAndUnlockBadges(userId, newActivity[0]);

                return {
                    status: 'success',
                    data: newActivity[0],
                    newBadges: unlockedBadges
                };

            } catch (error) {
                console.error(error);
                set.status = 500;
                return { status: 'error', message: 'Failed to save activity' };
            }
        }, {
            body: t.Object({
                type: t.Optional(t.String()),
                distance: t.Numeric(),
                duration: t.Numeric(),
                calories: t.Numeric(),
                routePath: t.Array(t.Object({
                    latitude: t.Number(),
                    longitude: t.Number(),
                    type: t.Optional(t.String()),
                    timestamp: t.Optional(t.Number())
                })),
                shoeId: t.Optional(t.Numeric()),
                startTime: t.Optional(t.String()),
                endTime: t.Optional(t.String()),
            })
        })

        .get('/', async ({ user, set }) => {
            const userId = Number(user.id);

            const history = await db.query.activities.findMany({
                where: eq(activities.userId, userId),
                orderBy: [desc(activities.startTime)],
                columns: {
                    id: true,
                    type: true,
                    distance: true,
                    duration: true,
                    calories: true,
                    pace: true,
                    startTime: true,
                }
            });

            return { data: history };
        })

        .get('/:id', async ({ params, set }) => {
            const id = Number(params.id);

            const activity = await db.query.activities.findFirst({
                where: eq(activities.id, id),
            });

            if (!activity) {
                set.status = 404;
                return { error: 'Activity not found' };
            }

            return { data: activity };
        })
    );