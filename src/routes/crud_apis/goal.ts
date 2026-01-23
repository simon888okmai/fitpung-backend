import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { weeklyGoals } from '../../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const goalRoutes = new Elysia({ prefix: '/goals' })

    // 🟢 1. GET /current (แบบ Test: ส่ง ?userId=1 มาตรงๆ)
    .get('/current', async ({ query, set }) => {
        try {
            // รับ userId จาก Query Param แทน Token
            const userId = Number(query.userId);

            if (!userId) {
                set.status = 400;
                return { status: 'error', message: 'UserId is required for testing' };
            }

            // --- Logic เดิม ---
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

            return { hasGoal: true, data: activeGoal };
            // ----------------

        } catch (error) {
            console.error(error);
            set.status = 500;
            return { status: 'error', message: 'Internal Server Error' };
        }
    }, {
        query: t.Object({
            userId: t.String() // รับเป็น String จาก URL
        })
    })

    // 🟢 2. POST / (แบบ Test: ส่ง userId มาใน Body เลย)
    .post('/', async ({ body, set }) => {
        try {
            // รับ userId และ target มาจาก Body ตรงๆ
            const { userId, target } = body;

            // --- Logic เดิม ---
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
                userId, // ใช้ userId ที่ส่งมา
                targetKm: target,
                currentKm: 0,
                startDate,
                endDate,
                status: 'ACTIVE'
            }).returning();

            return { status: 'success', action: 'created', data: newGoal[0] };
            // ----------------

        } catch (error) {
            console.error(error);
            set.status = 500;
            return { status: 'error', message: 'Could not create goal' };
        }
    }, {
        body: t.Object({
            userId: t.Numeric(), // 👈 เพิ่ม Validation ตรงนี้ให้รับ userId
            target: t.Numeric()
        })
    });