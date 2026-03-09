import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../../db';
import { users, usersProfile } from '../../db/schema';
import { eq, or } from 'drizzle-orm';

export const authRoutes = new Elysia()
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'secret',
    })
    )
    .post('/register', async ({ body, set, jwt }) => {
        try {
            // 1. รับข้อมูลที่จำเป็นสำหรับการสมัคร
            const { username, password, email } = body;

            // 2. เช็ค User/Email ซ้ำ
            const existingUser = await db.select()
                .from(users)
                .where(or(eq(users.username, username), eq(users.email, email)));

            if (existingUser.length > 0) {
                set.status = 409;
                return { success: false, message: 'Username หรือ Email นี้มีผู้ใช้งานแล้ว' };
            }

            // 3. Hash Password และสร้าง User
            const hashedPassword = await Bun.password.hash(password);

            const [newUser] = await db.insert(users).values({
                username,
                password: hashedPassword,
                email,
            }).returning({ id: users.id });

            const token = await jwt.sign({
                id: newUser.id,
                username: username
            });

            set.status = 201;
            return {
                success: true,
                message: 'สมัครสมาชิกสำเร็จ! กรุณาสร้างโปรไฟล์',
                token: token,
                user: {
                    id: newUser.id,
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

            // เช็คว่า User สร้าง Profile หรือยัง
            const [profile] = await db.select()
                .from(usersProfile)
                .where(eq(usersProfile.userId, user.id));

            const isProfileComplete = !!profile; // true ถ้ามีข้อมูล profile

            const token = await jwt.sign({
                id: user.id,
                username: user.username
            });

            set.status = 200;
            return {
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ!',
                token: token,
                isProfileComplete,
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

