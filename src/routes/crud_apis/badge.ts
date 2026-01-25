import { Elysia } from 'elysia';
import { db } from '../../db';
import { jwt } from '@elysiajs/jwt'
import { badges, userBadges } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const badgeRoutes = new Elysia({ prefix: '/badges' })
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'secret',
    }))
    .derive(async ({ jwt, headers, set }) => {
        const auth = headers['authorization'];
        const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) {
            set.status = 401; throw new Error('No token provided');
        }
        const profile = await jwt.verify(token);
        if (!profile) {
            set.status = 401; throw new Error('Invalid token');
        }
        return { user: profile };
    })
    .get('/', async ({ user, set }) => {
        try {
            const userId = Number(user.id);
            // ดึงเหรียญทั้งหมด + เช็คว่า User ได้หรือยัง
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

            // Map ผลลัพธ์กลับไป
            const result = allBadges.map(badge => {
                // 1. ดึงวันที่ออกมาจาก Map โดยใช้ ID ของเหรียญนั้นๆ
                const earnedDate = earnedMap.get(badge.id);

                return {
                    ...badge,
                    // 2. เช็คว่า "มีเหรียญ ID นี้ใน Map ไหม?" (ถ้ามี = ปลดล็อกแล้ว)
                    isUnlocked: earnedMap.has(badge.id),

                    // 3. ถ้ามีวันที่ ให้แปลงเป็น String ISO ส่งกลับไป (ถ้าไม่มีส่ง null)
                    earnedAt: earnedDate ? new Date(earnedDate).toISOString() : null
                };
            });

            return { status: 'success', data: result };
        } catch (error) {
            set.status = 500; return { error: 'Failed' };
        }
    });