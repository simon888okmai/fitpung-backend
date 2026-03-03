import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const authMiddleware = new Elysia({ name: 'authMiddleware' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'secret',
        })
    )
    .derive({ as: 'global' }, async ({ jwt, headers, set }) => {
        const auth = headers['authorization'];
        const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;

        if (!token) {
            set.status = 401;
            throw new Error('Unauthorized: No token provided');
        }

        const profile = await jwt.verify(token);
        if (!profile) {
            set.status = 401;
            throw new Error('Unauthorized: Invalid token');
        }

        return {
            user: profile as { id: number; username: string }
        };
    });
