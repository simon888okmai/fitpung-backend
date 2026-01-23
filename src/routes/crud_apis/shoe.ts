// src/routes/shoe.ts
import { Elysia, t } from 'elysia';
import { db } from '../../db'; // ตรวจสอบ path import ให้ตรงกับโครงสร้างโฟลเดอร์จริงของคุณ
import { shoes } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const shoeRoutes = new Elysia({ prefix: '/shoes' })

    // 🟢 1. GET /?userId=1 -> ดูรายการรองเท้าทั้งหมด
    .get('/', async ({ query, set }) => {
        const userId = Number(query.userId);
        if (!userId) {
            set.status = 400;
            return { error: 'UserId required' };
        }

        try {
            const myShoes = await db.query.shoes.findMany({
                where: and(
                    eq(shoes.userId, userId),
                    eq(shoes.status, 'ACTIVE') // เอาเฉพาะคู่ที่ยังใช้อยู่
                ),
                orderBy: [desc(shoes.isDefault), desc(shoes.createdAt)] // เอาคู่ Default ขึ้นบนสุด
            });

            return { status: 'success', data: myShoes };
        } catch (error) {
            console.error(error);
            set.status = 500;
            return { error: 'Failed to fetch shoes' };
        }
    })

    // 🟢 2. POST / -> เพิ่มรองเท้าคู่ใหม่ (Auto Set Default)
    .post('/', async ({ body, set }) => {
        try {
            // รับค่ามา (ใช้ let เพราะเราอาจจะแก้ค่า isDefault)
            let { userId, brand, model, name, maxDistance, isDefault } = body;

            // 🛠️ LOGIC: ถ้าไม่ได้ระบุ isDefault มา -> ให้บังคับเป็น True (คู่หลัก) ทันที
            if (isDefault === undefined || isDefault === null) {
                isDefault = true;
            }

            // 1. ถ้าคู่ใหม่จะเป็น Default -> ต้องไป "ปลด Default" คู่เก่าของ User คนนี้ทั้งหมดก่อน
            if (isDefault) {
                await db.update(shoes)
                    .set({ isDefault: false })
                    .where(eq(shoes.userId, userId));
            }

            // 2. สร้างคู่ใหม่
            const newShoe = await db.insert(shoes).values({
                userId,
                brand,
                model,
                name: name || `${brand} ${model}`, // ถ้าไม่ตั้งชื่อเล่น ให้ใช้ชื่อรุ่น
                maxDistance: maxDistance || 800,   // ค่ามาตรฐาน 800km
                isDefault: isDefault,
                currentDistance: 0,
                status: 'ACTIVE'
            }).returning();

            return { status: 'success', data: newShoe[0] };

        } catch (error) {
            console.error(error);
            set.status = 500;
            return { error: 'Failed to add shoe' };
        }
    }, {
        body: t.Object({
            userId: t.Numeric(),
            brand: t.String(),
            model: t.String(),
            name: t.Optional(t.String()),
            maxDistance: t.Optional(t.Numeric()),
            isDefault: t.Optional(t.Boolean()) // ส่งหรือไม่ส่งก็ได้ (ถ้าไม่ส่งจะเป็น True)
        })
    })

    // 🟢 3. PATCH /:id/default -> สั่งให้คู่นี้เป็นคู่หลัก (Set as Default)
    .patch('/:id/default', async ({ params, body, set }) => {
        const shoeId = Number(params.id);
        const { userId } = body;

        try {
            // 1. ปลด Default คู่เก่าทั้งหมดของ User คนนี้
            await db.update(shoes)
                .set({ isDefault: false })
                .where(eq(shoes.userId, userId));

            // 2. ตั้งคู่นี้เป็น Default
            await db.update(shoes)
                .set({ isDefault: true })
                .where(eq(shoes.id, shoeId));

            return { status: 'success', message: 'Default shoe updated' };
        } catch (error) {
            set.status = 500;
            return { error: 'Failed to set default shoe' };
        }
    }, {
        body: t.Object({
            userId: t.Numeric()
        })
    })

    // 🟢 4. PATCH /:id/retire -> ปลดระวาง (Retire)
    .patch('/:id/retire', async ({ params }) => {
        const id = Number(params.id);

        await db.update(shoes)
            .set({
                status: 'RETIRED',
                isDefault: false // ปลดระวางแล้วต้องไม่เป็น Default
            })
            .where(eq(shoes.id, id));

        return { status: 'success', message: 'Shoe retired' };
    });