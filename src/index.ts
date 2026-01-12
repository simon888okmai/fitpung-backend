import { Elysia } from 'elysia';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';

const app = new Elysia()
    .get('/', () => ({
        status: 200,
        message: 'Server is running'
    }))
    // รวม Route ต่างๆ เข้ามา
    .use(authRoutes)
    .use(userRoutes)
    .listen(3001);

console.log(`🦊 Backend พร้อมแล้วที่ port ${app.server?.port}`);