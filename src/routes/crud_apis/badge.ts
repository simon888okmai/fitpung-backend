import { Elysia } from 'elysia';
import { db } from '../../db';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { badges, userBadges } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const badgeRoutes = new Elysia()
    .use(authMiddleware)
    .group('/badges', (app) => app
        .get('/', async ({ user, set }) => {
            try {
                const userId = Number(user.id);
                const allBadges = await db.query.badges.findMany();
                const myBadges = await db.select({
                    badgeId: userBadges.badgeId,
                    earnedAt: userBadges.earnedAt
                })
                    .from(userBadges)
                    .where(eq(userBadges.userId, userId));

                const earnedMap = new Map();
                myBadges.forEach(badge => {
                    earnedMap.set(badge.badgeId, badge.earnedAt);
                });

                const result = allBadges.map(badge => {
                    const earnedDate = earnedMap.get(badge.id);

                    return {
                        ...badge,
                        isUnlocked: earnedMap.has(badge.id),
                        earnedAt: earnedDate ? new Date(earnedDate).toISOString() : null
                    };
                });

                return { status: 'success', data: result };
            } catch (error) {
                set.status = 500; return { error: 'Failed' };
            }
        })
    );