// src/routes/crud_apis/activity.ts
import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { activities } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { updateWeeklyGoalProgress } from '../../services/goal.service';
import { updateShoeMileage } from '../../services/shoe.service';
import { checkAndUnlockBadges } from '../../services/badge.service'; // ✅ 1. Import Service

export const activityRoutes = new Elysia({ prefix: '/activities' })

    // 🟢 1. บันทึกการวิ่ง (POST /)
    .post('/', async ({ body, set }) => {
        try {
            const { userId, type, distance, duration, calories, routePath, shoeId, startTime, endTime } = body;

            // A. บันทึก Activity ลง Database
            const newActivity = await db.insert(activities).values({
                userId,
                type: type || 'RUN',
                distance,
                duration,
                calories,
                pace: distance > 0 ? (duration / 60) / distance : 0, // ป้องกันการหารด้วย 0
                routePath,
                startTime: startTime ? new Date(startTime) : new Date(),
                endTime: endTime ? new Date(endTime) : undefined,
                shoeId: shoeId || null,
            }).returning();

            // B. [Auto-Update Goal] อัปเดตเป้าหมายรายสัปดาห์
            await updateWeeklyGoalProgress(userId, distance);

            // C. [Auto-Update Shoe] อัปเดตระยะทางรองเท้า (ถ้าใส่)
            if (shoeId) {
                await updateShoeMileage(shoeId, distance);
            }

            // D. [Check Badges] 🏅 ตรวจสอบเหรียญรางวัลทันที!
            // (ส่ง userId และ Activity ที่เพิ่งบันทึกเสร็จไปเช็ค)
            const unlockedBadges = await checkAndUnlockBadges(userId, newActivity[0]);

            return {
                status: 'success',
                data: newActivity[0],
                newBadges: unlockedBadges // ✅ ส่งเหรียญที่เพิ่งได้กลับไปให้ Frontend เด้ง Popup
            };

        } catch (error) {
            console.error(error);
            set.status = 500;
            return { status: 'error', message: 'Failed to save activity' };
        }
    }, {
        body: t.Object({
            userId: t.Numeric(),
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

    // 🟢 2. ดูประวัติทั้งหมด (GET /?userId=1)
    .get('/', async ({ query, set }) => {
        const userId = Number(query.userId);
        if (!userId) { set.status = 400; return { error: 'UserId required' }; }

        const history = await db.query.activities.findMany({
            where: eq(activities.userId, userId),
            orderBy: [desc(activities.startTime)], // เรียงจากใหม่ไปเก่า
            columns: {
                id: true,
                type: true,
                distance: true,
                duration: true,
                calories: true,
                startTime: true,
                // ไม่ส่ง routePath เพื่อความเร็ว
            }
        });

        return { data: history };
    })

    // 🟢 3. ดูรายละเอียดเจาะลึก (GET /:id)
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
    });