import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../../db';
import { usersProfile } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const profileRoutes = new Elysia()
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'secret',
    }))
    .post('/profile/complete', async ({ body, set, headers, jwt }) => {
        try {
            // เช็ค Authorization
            const authHeader = headers['authorization'];
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const token = authHeader.split(' ')[1];
            const payload = await jwt.verify(token);

            if (!payload || !payload.id) {
                set.status = 401;
                return { success: false, message: 'Invalid token' };
            }

            const userId = payload.id as number;

            // เช็คว่ามี Profile อยู่แล้วหรือไม่
            const existingProfile = await db.select()
                .from(usersProfile)
                .where(eq(usersProfile.userId, userId));

            if (existingProfile.length > 0) {
                set.status = 400;
                return { success: false, message: 'โปรไฟล์ถูกสร้างไปแล้ว' };
            }

            // รับข้อมูลโปรไฟล์
            const { name, date_of_birth, gender, height, weight } = body;

            // สร้าง Profile
            await db.insert(usersProfile).values({
                userId,
                name,
                dateOfBirth: date_of_birth,
                gender,
                height,
                weight,
            });

            set.status = 201;
            return {
                success: true,
                message: 'สร้างโปรไฟล์สำเร็จ!',
            };

        } catch (error) {
            console.error('Complete Profile Error:', error);
            set.status = 500;
            return { success: false, message: 'เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์' };
        }
    }, {
        body: t.Object({
            name: t.String(),
            date_of_birth: t.String(),
            gender: t.String(),
            height: t.Number(),
            weight: t.Number(),
        })
    });
