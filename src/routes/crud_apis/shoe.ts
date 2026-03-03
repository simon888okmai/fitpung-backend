// src/routes/shoe.ts
import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { shoes } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const shoeRoutes = new Elysia()
    .use(authMiddleware)
    .group('/shoes', (app) => app
        // 🟢 1. GET / -> ดูรายการรองเท้าทั้งหมด
        .get('/', async ({ user, set }) => {
            const userId = Number(user.id);

            try {
                const myShoes = await db.query.shoes.findMany({
                    where: and(
                        eq(shoes.userId, userId),
                        eq(shoes.status, 'ACTIVE')
                    ),
                    orderBy: [desc(shoes.isDefault), desc(shoes.createdAt)]
                });

                return { status: 'success', data: myShoes };
            } catch (error) {
                console.error(error);
                set.status = 500;
                return { error: 'Failed to fetch shoes' };
            }
        })

        // 🟢 2. POST / -> เพิ่มรองเท้าคู่ใหม่
        .post('/', async ({ body, user, set }) => {
            try {
                const userId = Number(user.id);
                let { brand, model, name, maxDistance, isDefault } = body;

                if (isDefault === undefined || isDefault === null) {
                    isDefault = true;
                }

                if (isDefault) {
                    await db.update(shoes)
                        .set({ isDefault: false })
                        .where(eq(shoes.userId, userId));
                }

                const newShoe = await db.insert(shoes).values({
                    userId,
                    brand,
                    model,
                    name: name || `${brand} ${model}`,
                    maxDistance: maxDistance || 800,
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
                brand: t.String(),
                model: t.String(),
                name: t.Optional(t.String()),
                maxDistance: t.Optional(t.Numeric()),
                isDefault: t.Optional(t.Boolean())
            })
        })

        // 🟢 3. PATCH /:id/default -> สั่งให้คู่นี้เป็นคู่หลัก
        .patch('/:id/default', async ({ params, user, set }) => {
            const shoeId = Number(params.id);
            const userId = Number(user.id);

            try {
                await db.update(shoes)
                    .set({ isDefault: false })
                    .where(eq(shoes.userId, userId));

                await db.update(shoes)
                    .set({ isDefault: true })
                    .where(eq(shoes.id, shoeId));

                return { status: 'success', message: 'Default shoe updated' };
            } catch (error) {
                set.status = 500;
                return { error: 'Failed to set default shoe' };
            }
        })

        // 🟢 4. PATCH /:id/retire -> ปลดระวาง
        .patch('/:id/retire', async ({ params }) => {
            const id = Number(params.id);

            await db.update(shoes)
                .set({
                    status: 'RETIRED',
                    isDefault: false
                })
                .where(eq(shoes.id, id));

            return { status: 'success', message: 'Shoe retired' };
        })
    );