import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../../db';
import { activities, weeklyGoals, userBadges, badges, usersProfile } from '../../db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

export const activityPageRoute = new Elysia({ prefix: '/stats' })
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'secret', // ⚠️ Production ควรใช้ .env จริงจังนะครับ
    }))
    .derive(async ({ jwt, headers, set }) => {
        const auth = headers['authorization']
        const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;

        if (!token) {
            set.status = 401;
            throw new Error('No token provided')
        }

        const profile = await jwt.verify(token);
        if (!profile) {
            set.status = 401;
            throw new Error('Invalid token')
        }

        return {
            user: profile
        };
    })
    // 🟢 GET /?month=1&year=2026
    .get('/', async ({ query, set, user }) => {
        const userId = Number(user.id);
        const month = Number(query.month);
        const year = Number(query.year);

        if (!month || !year) { // userId มีแน่ๆ เพราะมาจาก token
            set.status = 400;
            return { error: 'Month and year are required' };
        }

        try {
            // 👤 0. ดึงชื่อ User
            const profile = await db.query.usersProfile.findFirst({
                where: eq(usersProfile.userId, userId)
            });

            // 🗓️ 1. กำหนดช่วงเวลาเดือนนี้
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            // 🏃‍♂️ 2. ดึง Activity เดือนนี้
            const monthlyActivities = await db.query.activities.findMany({
                where: and(
                    eq(activities.userId, userId),
                    gte(activities.startTime, startDate),
                    lte(activities.startTime, endDate)
                ),
                orderBy: [desc(activities.startTime)]
            });

            // --- 🧮 คำนวณ Summary ---
            const totalDistance = monthlyActivities.reduce((sum, act) => sum + act.distance, 0);
            const totalDuration = monthlyActivities.reduce((sum, act) => sum + act.duration, 0); // หน่วยเป็นอะไรขึ้นอยู่กับ DB (วินาที หรือ นาที)
            const totalCalories = monthlyActivities.reduce((sum, act) => sum + act.calories, 0);

            // Run Days (เฉพาะวันที่)
            // Logic นี้โอเค เพราะเอาแค่ "เลขวันที่" (1-31) ไม่เกี่ยวกับ Timezone มากนัก
            const runDays = [...new Set(monthlyActivities.map(act => {
                return act.startTime ? new Date(act.startTime).getDate() : null
            }))].filter(d => d !== null).sort((a, b) => (a || 0) - (b || 0));

            const streak = 3; // TODO: Mock

            // --- 🎯 Weekly Goal ---
            const activeGoal = await db.query.weeklyGoals.findFirst({
                where: and(eq(weeklyGoals.userId, userId), eq(weeklyGoals.status, 'ACTIVE')),
                orderBy: [desc(weeklyGoals.createdAt)]
            });

            // --- 🏆 Badges ---
            const myBadgeCount = (await db.select({ count: sql<number>`count(*)` })
                .from(userBadges).where(eq(userBadges.userId, userId)))[0].count;
            const totalBadgeCount = (await db.select({ count: sql<number>`count(*)` })
                .from(badges))[0].count;

            // --- 📝 Recent Runs (RAW DATA MODE) ---
            const recentRuns = monthlyActivities.slice(0, 5).map(run => {
                return {
                    id: `run-${run.id}`,
                    // ✅ ส่ง Timestamp ดิบๆ ให้ Frontend แปลงเป็น "Jan 22, 18:30" ตามเวลาเครื่องเขา
                    timestamp: run.startTime,

                    distance: Number(run.distance.toFixed(2)),

                    // ✅ ส่งตัวเลขดิบๆ (วินาที/นาที) ให้ Frontend แปลงเป็น "00:30:00"
                    duration: run.duration,

                    // ✅ Pace ส่งตัวเลขดิบๆ ไปเลย
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
                    totalTime: totalDuration, // ✅ ส่งตัวเลขรวม
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
    });
