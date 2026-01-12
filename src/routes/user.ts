import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users_profile } from '../db/schema';
import { eq } from 'drizzle-orm';

export const userRoutes = new Elysia()
    .patch('/update-name', async ({ body, set }) => {
        try {
            const { userId, newName } = body;

            // สั่ง Update ข้อมูล
            await db.update(users_profile)
                .set({
                    name: newName, // เปลี่ยนค่าในคอลัมน์ name เป็นค่าใหม่
                })
                .where(eq(users_profile.user_id, userId)); // 🚨 สำคัญ: ระบุว่าแก้ของ ID ไหน

            set.status = 200;
            return {
                success: true,
                message: `เปลี่ยนชื่อเป็น "${newName}" เรียบร้อยแล้ว`,
                updatedId: userId
            };

        } catch (error) {
            console.error('Update Error:', error);
            set.status = 500;
            return { success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ' };
        }
    }, {
        // Validation: รับ ID (เพื่อระบุตัวตน) และ ชื่อใหม่
        body: t.Object({
            userId: t.Number(),
            newName: t.String()
        })
    });
