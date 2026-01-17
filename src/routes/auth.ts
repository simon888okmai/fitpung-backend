import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { users, users_profile } from '../db/schema';
import { eq, or } from 'drizzle-orm';

export const authRoutes = new Elysia()
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'secret',
    })
    )
    .post('/register', async ({ body, set, jwt }) => {
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

            let newUserId = null;
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

                newUserId = newUser.id;

                // 3.3 สร้าง Profile (ใช้ ID จากข้อ 3.2)
                await tx.insert(users_profile).values({
                    user_id: newUser.id,
                    name,
                    date_of_birth: date_of_birth, // ส่งสตริง YYYY-MM-DD
                    gender,
                    height,
                    weight,
                });
            });

            const token = await jwt.sign({
                id: newUserId,
                username: username
            });

            set.status = 201;
            return {
                success: true,
                message: 'สมัครสมาชิกพร้อมสร้างโปรไฟล์สำเร็จ!',
                token: token,
                user: {
                    id: newUserId,
                    username: username,
                    email: email,
                }
            };

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
    .post('/login', async ({ body, set, jwt }) => {
        try {
            const { username, password } = body;
            const [user] = await db.select()
                .from(users)
                .where(eq(users.username, username));

            if (!user) {
                set.status = 401;
                return { success: false, message: 'ไม่พบผู้ใช้งาน' };
            }

            const isMatch = await Bun.password.verify(password, user.password);
            if (!isMatch) {
                set.status = 401;
                return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
            }

            const token = await jwt.sign({
                id: user.id,
                username: user.username
            });

            set.status = 200;
            return {
                success: true, message: 'เข้าสู่ระบบสำเร็จ!',
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                }
            };
        } catch (error) {
            console.error('Login Error:', error);
            set.status = 500;
            return { success: false, message: 'เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์' };
        }
    }, {
        body: t.Object({
            username: t.String(),
            password: t.String(),
        })
    });

