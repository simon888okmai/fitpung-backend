import { db } from '../db';
import { badges, userBadges, activities } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export const checkAndUnlockBadges = async (userId: number, currentActivity: any) => {
    // 1. ดึงสถิติรวมจาก DB
    const stats = await db.select({
        totalDistance: sql<number>`coalesce(sum(${activities.distance}), 0)`,
        totalRuns: sql<number>`count(${activities.id})`,
    })
        .from(activities)
        .where(eq(activities.userId, userId));

    const totalRuns = Number(stats[0].totalRuns);

    // 2. เตรียมตัวแปรจาก Activity ปัจจุบัน
    const runDist = Number(currentActivity.distance);
    const runCal = Number(currentActivity.calories);
    const runDuration = Number(currentActivity.duration); // (นาที)
    const runPace = Number(currentActivity.pace);

    // เรื่องเวลา ⏰
    const runDate = new Date(currentActivity.startTime);
    const hour = runDate.getHours();
    const day = runDate.getDay();       // 0=Sun, 6=Sat

    // 3. กรองเหรียญที่ User มีแล้วออก
    const ownedBadges = await db.select({ id: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId));
    const ownedIds = ownedBadges.map(b => b.id);

    const availableBadges = await db.query.badges.findMany({
        where: ownedIds.length > 0 ? sql`${badges.id} NOT IN ${ownedIds}` : undefined
    });

    const newUnlockedBadges = [];

    // 4. 🕵️‍♂️ ตรวจเงื่อนไข (Switch Case)
    for (const badge of availableBadges) {
        let isUnlocked = false;

        switch (badge.criteriaType) {
            case 'TOTAL_RUNS':
                if (totalRuns >= badge.criteriaValue) isUnlocked = true; break;
            case 'ONE_RUN_DIST':
                if (runDist >= badge.criteriaValue) isUnlocked = true; break;
            case 'ONE_RUN_CAL': // 🔥 Burning Man
                if (runCal >= badge.criteriaValue) isUnlocked = true; break;
            case 'ONE_RUN_DURATION': // 🔋 Hour of Power
                if (runDuration >= badge.criteriaValue) isUnlocked = true; break;
            case 'TIME_MORNING': // 🐔 05:00 - 10:00
                if (hour >= 5 && hour < 10) isUnlocked = true; break;
            case 'TIME_NIGHT': // 🦉 20:00 - 04:00
                if (hour >= 20 || hour < 4) isUnlocked = true; break;
            case 'DAY_WEEKEND': // 🏖️ Sat/Sun
                if (day === 0 || day === 6) isUnlocked = true; break;
            case 'SPECIAL_SPEED_DEMON': // ⚡ Pace <= 4 & Dist >= 10
                if (runDist >= 10 && runPace <= 4) isUnlocked = true; break;
        }

        if (isUnlocked) {
            await db.insert(userBadges).values({
                userId, badgeId: badge.id, earnedAt: new Date()
            });
            newUnlockedBadges.push(badge);
        }
    }
    return newUnlockedBadges;
};