import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { activities, weeklyGoals, userBadges, badges, usersProfile } from '../../db/schema'; // ✅ เพิ่ม usersProfile
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

export const activityPageRoute = new Elysia({ prefix: '/stats' })

    // 🟢 GET /?userId=1&month=1&year=2026
    .get('/', async ({ query, set }) => {
        const userId = Number(query.userId);
        const month = Number(query.month); // 1-12
        const year = Number(query.year);

        if (!userId || !month || !year) {
            set.status = 400;
            return { error: 'userId, month, and year are required' };
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
            const totalDurationMins = monthlyActivities.reduce((sum, act) => sum + act.duration, 0);
            const totalCalories = monthlyActivities.reduce((sum, act) => sum + act.calories, 0);

            // Run Days (เฉพาะวันที่)
            const runDays = [...new Set(monthlyActivities.map(act => {
                return act.startTime ? new Date(act.startTime).getDate() : null
            }))].filter(d => d !== null).sort((a, b) => (a || 0) - (b || 0));

            // --- 🔥 คำนวณ Streak (Mock หรือ Simple Logic) ---
            // (เพื่อให้ตรงกับ Mock data ตอนนี้ขอใส่ Logic ง่ายๆ หรือ 0 ไปก่อน)
            // ถ้าอยากได้ Logic จริงต้องดึงข้อมูลย้อนหลังไปไกลกว่าเดือนนี้
            const streak = 3; // TODO: ใส่ Logic คำนวณ Streak จริงภายหลัง

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

            // --- 📝 Recent Runs (Format ให้ตรง Mock) ---
            const recentRuns = monthlyActivities.slice(0, 5).map(run => {
                const dateObj = new Date(run.startTime!);
                return {
                    id: `run-${run.id}`,
                    date: formatDateText(dateObj), // "Jan 22, 2026"
                    time: formatTimeText(dateObj), // "18:30"
                    distance: Number(run.distance.toFixed(2)),
                    duration: formatDuration(run.duration), // "00:30:00"
                    pace: calculatePaceFormatted(run.duration, run.distance), // "6'00''"
                    kcal: run.calories
                };
            });

            // ✅ Return ตามโครงสร้าง ACTIVITY_DATA_FULL เป๊ะๆ
            return {
                user: {
                    name: profile?.name || "Runner",
                },
                currentMonth: `${getMonthName(month)} ${year}`, // "January 2026"

                summary: {
                    streak: streak,
                    totalDistance: Number(totalDistance.toFixed(2)),
                    totalTime: formatDuration(totalDurationMins), // "HH:MM:SS"
                    totalCalories: totalCalories,
                    runDays: runDays,
                },

                cards: {
                    weeklyGoal: {
                        current: activeGoal ? activeGoal.currentKm : 0,
                        target: activeGoal ? activeGoal.targetKm : 100, // Default 100
                        unit: "km",
                        status: activeGoal && activeGoal.currentKm >= activeGoal.targetKm ? "Completed" : "On Track",
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

// ==========================================
// 🛠️ Helper Functions (ตัวช่วยจัด Format)
// ==========================================

// 1. แปลงเดือนตัวเลข -> ชื่อเต็ม (1 -> "January")
function getMonthName(month: number) {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('en-US', { month: 'long' });
}

// 2. แปลงนาที -> HH:MM:SS (เช่น 65 นาที -> "01:05:00")
function formatDuration(totalMinutes: number) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    const s = 0; // ใน DB เราเก็บเป็นนาที วินาทีเลยเป็น 0 (ถ้าอยากละเอียดต้องแก้ DB เก็บเป็นวินาที)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 3. แปลงวันที่ -> "Jan 22, 2026"
function formatDateText(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// 4. แปลงเวลา -> "18:30"
function formatTimeText(date: Date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// 5. คำนวณ Pace -> "6'00''"
function calculatePaceFormatted(durationMins: number, distanceKm: number) {
    if (distanceKm <= 0) return "0'00''";
    const paceDec = durationMins / distanceKm;
    const pMin = Math.floor(paceDec);
    const pSec = Math.round((paceDec - pMin) * 60);
    return `${pMin}'${pSec.toString().padStart(2, '0')}''`;
}