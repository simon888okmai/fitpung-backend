import { Elysia } from 'elysia';
import { db } from '../../db';
import { badges, userBadges } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const badgeRoutes = new Elysia({ prefix: '/badges' })
    .get('/', async ({ query, set }) => {
        const userId = Number(query.userId);
        if (!userId) { set.status = 400; return { error: 'UserId required' }; }

        try {
            // ดึงเหรียญทั้งหมด + เช็คว่า User ได้หรือยัง
            const allBadges = await db.query.badges.findMany();
            const myBadges = await db.select({ badgeId: userBadges.badgeId })
                .from(userBadges).where(eq(userBadges.userId, userId));

            const myBadgeSet = new Set(myBadges.map(b => b.badgeId));

            // Map ผลลัพธ์กลับไป
            const result = allBadges.map(badge => ({
                ...badge,
                isUnlocked: myBadgeSet.has(badge.id) // ✅ true/false
            }));

            return { status: 'success', data: result };
        } catch (error) {
            set.status = 500; return { error: 'Failed' };
        }
    });