import { Elysia } from 'elysia';
import { authRoutes } from './routes/crud_apis/auth';
import { goalRoutes } from './routes/crud_apis/goal';
import { activityRoutes } from './routes/crud_apis/activity';
import { homeRoutes } from './routes/aggregation/home';
import { shoeRoutes } from './routes/crud_apis/shoe';
import { badgeRoutes } from './routes/crud_apis/badge';
import { activityPageRoute } from './routes/aggregation/activitypage';

const app = new Elysia()
    .get('/', () => ({
        status: 200,
        message: 'Server is running'
    }))
    // รวม Route ต่างๆ เข้ามา
    .use(authRoutes)
    .use(goalRoutes)
    .use(activityRoutes)
    .use(homeRoutes)
    .use(badgeRoutes)
    .use(shoeRoutes)
    .use(activityPageRoute)
    .listen(3001);

console.log(`🦊 Backend พร้อมแล้วที่ port ${app.server?.port}`);