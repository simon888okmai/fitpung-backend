import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { usersProfile, weeklyGoals, activities, shoes } from '../../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const homeRoutes = new Elysia({ prefix: '/home' })

    .get('/', async ({ query, set }) => {
        try {
            const userId = Number(query.userId);
            if (!userId) {
                set.status = 400;
                return { error: 'UserId required' };
            }

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
                    columns: { name: true } // Mock มีแค่ name (image เอาออกได้ถ้าไม่ได้ใช้)
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

            // --- 3. จัด Format ให้ตรงกับ Mock Data เป๊ะๆ ---
            return {
                status: 'success',
                data: {
                    // 1. User
                    user: {
                        name: profile?.name || 'Runner',
                    },

                    // 2. Weekly Goal (ตรงกับ MOCK_DASHBOARD_FULL.weeklyGoal)
                    weeklyGoal: currentGoal ? {
                        current: currentGoal.currentKm,
                        target: currentGoal.targetKm,
                        streak: 0, // 🚧 TODO: เดี๋ยวค่อยทำ Logic คำนวณ Streak ทีหลัง
                        unit: "km"
                    } : null,

                    // 3. Last Run (ตรงกับ MOCK_DASHBOARD_FULL.lastRun)
                    lastRun: lastActivity ? {
                        date: lastActivity.startTime, // ส่งเป็น Date Object (Frontend แปลงเป็น "Yesterday" เอง)
                        distance: lastActivity.distance, // ส่งเลขเพียวๆ (Frontend เติม "km" เอง)
                        duration: lastActivity.duration, // ส่งวินาที (Frontend แปลงเป็น "1:32:10" เอง)
                        pace: lastActivity.pace,
                        calories: lastActivity.calories
                    } : null,

                    // 4. Active Shoe (ตรงกับ MOCK_DASHBOARD_FULL.activeShoe)
                    activeShoe: defaultShoe ? {
                        name: `${defaultShoe.brand} ${defaultShoe.model}`, // รวมชื่อแบรนด์+รุ่นให้เหมือน Mock
                        currentDistance: defaultShoe.currentDistance, // แก้เป็น CamelCase (แนะนำให้แก้ Frontend ให้รับ camelCase ด้วยครับ)
                        maxDistance: defaultShoe.maxDistance
                    } : null
                }
            };

        } catch (error) {
            console.error(error);
            set.status = 500;
            return { error: 'Failed to fetch homepage data' };
        }
    });