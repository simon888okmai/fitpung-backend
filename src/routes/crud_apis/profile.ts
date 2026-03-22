import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { usersProfile } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const profileRoutes = new Elysia()
    .use(authMiddleware)
    .post('/profile/complete', async ({ body, set, user }) => {
        try {
            const userId = Number(user.id);

            const existingProfile = await db.select()
                .from(usersProfile)
                .where(eq(usersProfile.userId, userId));

            if (existingProfile.length > 0) {
                set.status = 400;
                return { success: false, message: 'โปรไฟล์ถูกสร้างไปแล้ว' };
            }

            const { name, date_of_birth, gender, height, weight } = body;

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
    })
    .get('/profile/me', async ({ user, set }) => {
        try {
            const userId = Number(user.id);

            const profile = await db.select()
                .from(usersProfile)
                .where(eq(usersProfile.userId, userId));

            if (profile.length === 0) {
                set.status = 404;
                return { success: false, message: 'Profile not found' };
            }

            set.status = 200;
            return {
                success: true,
                data: profile[0]
            };
        } catch (error) {
            console.error('Get Profile Error:', error);
            set.status = 500;
            return { success: false, message: 'Internal server error' };
        }
    })
    .patch('/profile/me', async ({ body, user, set }) => {
        try {
            const userId = Number(user.id);

            const { name, weight, height } = body;

            await db.update(usersProfile)
                .set({
                    ...(name && { name }),
                    ...(weight && { weight }),
                    ...(height && { height })
                })
                .where(eq(usersProfile.userId, userId));

            set.status = 200;
            return {
                success: true,
                message: 'Profile updated successfully!',
            };

        } catch (error) {
            console.error('Update Profile Error:', error);
            set.status = 500;
            return { success: false, message: 'Internal server error' };
        }
    }, {
        body: t.Object({
            name: t.Optional(t.String()),
            weight: t.Optional(t.Number()),
            height: t.Optional(t.Number()),
        })
    })
