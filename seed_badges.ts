import { db } from './src/db';
import { badges } from './src/db/schema';

async function main() {
    const badgeData = [
        {
            name: 'First Step',
            description: 'วิ่งครั้งแรกสำเร็จ',
            criteriaType: 'TOTAL_RUNS',
            criteriaValue: 1,
            icon: '👟'
        },
        {
            name: '5K Runner',
            description: 'วิ่งได้ 5km ในครั้งเดียว',
            criteriaType: 'ONE_RUN_DIST',
            criteriaValue: 5,
            icon: '🏃'
        },
        {
            name: '10K Master',
            description: 'วิ่งได้ 10km ในครั้งเดียว',
            criteriaType: 'ONE_RUN_DIST',
            criteriaValue: 10,
            icon: '🏅'
        },
        {
            name: 'Calorie Burner',
            description: 'เผาผลาญ 500 kcal ในครั้งเดียว',
            criteriaType: 'ONE_RUN_CAL',
            criteriaValue: 500,
            icon: '🔥'
        },
        {
            name: 'Hour of Power',
            description: 'วิ่งนานเกิน 60 นาที',
            criteriaType: 'ONE_RUN_DURATION',
            criteriaValue: 60,
            icon: '🔋'
        },
        {
            name: 'Early Bird',
            description: 'วิ่งเช้าตรู่ (05:00 - 10:00)',
            criteriaType: 'TIME_MORNING',
            criteriaValue: 0,
            icon: '🐔'
        },
        {
            name: 'Night Owl',
            description: 'วิ่งรอบดึก (20:00 - 04:00)',
            criteriaType: 'TIME_NIGHT',
            criteriaValue: 0,
            icon: '🦉'
        },
        {
            name: 'Weekend Warrior',
            description: 'วิ่งวันเสาร์-อาทิตย์',
            criteriaType: 'DAY_WEEKEND',
            criteriaValue: 0,
            icon: '🏖️'
        },
        {
            name: 'Speed Demon',
            description: 'วิ่ง 10km ด้วย Pace <= 4',
            criteriaType: 'SPECIAL_SPEED_DEMON',
            criteriaValue: 0,
            icon: '⚡'
        }
    ];

    console.log('🌱 Starting Seeding Badges into Database...');

    try {
        await db.insert(badges).values(badgeData);
        console.log('✅ Badges seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding badges:', error);
    }

    process.exit(0);
}

main();
