import { Elysia, t } from 'elysia';
import { db } from './db';
import { users, users_profile } from './db/schema';
import { eq, or } from 'drizzle-orm';

const app = new Elysia()
    .get('/', () => ({
        status: 200,
        message: 'Server is running'
    }))
    .post('/register', async ({ body, set }) => {
        try {
            // 1. รับข้อมูลทั้งหมดมาเป็นก้อนเดียว
            const {
                username, password, email, // ส่วน User
                name, date_of_birth, gender, height, weight // ส่วน Profile
            } = body;

            // 2. เช็ค User/Email ซ้ำ
            const existingUser = await db.select()
                .from(users)
                .where(or(eq(users.username, username), eq(users.email, email)));

            if (existingUser.length > 0) {
                set.status = 409;
                return { success: false, message: 'Username หรือ Email นี้มีผู้ใช้งานแล้ว' };
            }

            // 3. เริ่ม Transaction (จุดสำคัญ!)
            await db.transaction(async (tx) => {

                // 3.1 Hash Password
                const hashedPassword = await Bun.password.hash(password);

                // 3.2 สร้าง User
                const [newUser] = await tx.insert(users).values({
                    username,
                    password: hashedPassword,
                    email,
                }).returning({ id: users.id });

                // 3.3 สร้าง Profile (ใช้ ID จากข้อ 3.2)
                await tx.insert(users_profile).values({
                    user_id: newUser.id,
                    name,
                    date_of_birth: date_of_birth, // ส่งสตริง YYYY-MM-DD
                    gender,
                    height,
                    weight: weight.toString(), // แปลงเป็น string เพราะใน DB เป็น decimal
                });
            });

            set.status = 201;
            return { success: true, message: 'สมัครสมาชิกพร้อมสร้างโปรไฟล์สำเร็จ!' };

        } catch (error) {
            console.error('Register Error:', error);
            set.status = 500;
            return { success: false, message: 'เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์' };
        }
    }, {
        // Validation: เช็คของที่ส่งมาต้องครบ
        body: t.Object({
            username: t.String(),
            password: t.String(),
            email: t.String(),
            name: t.String(),
            date_of_birth: t.String(),
            gender: t.String(),
            height: t.Number(),
            weight: t.Number(),
        })
    })
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
    })
    .listen(3001);

console.log(`🦊 Backend พร้อมแล้วที่ port ${app.server?.port}`);