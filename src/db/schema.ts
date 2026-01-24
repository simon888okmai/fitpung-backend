// src/db/schema.ts
import { pgTable, serial, text, varchar, integer, timestamp, date, doublePrecision, boolean, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --------------------------------------------------------
// 1. Users & Profile
// --------------------------------------------------------
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 256 }).notNull().unique(),
    password: text('password').notNull(),
    email: varchar('email', { length: 256 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usersProfile = pgTable('users_profile', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id).unique(),
    name: varchar('name', { length: 256 }).notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: varchar('gender', { length: 50 }).notNull(),
    height: integer('height').notNull(),
    weight: integer('weight').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// --------------------------------------------------------
// 2. Shoes (ตู้รองเท้า)
// --------------------------------------------------------
export const shoes = pgTable('shoes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),

    brand: varchar('brand', { length: 100 }).notNull(), // เช่น Nike, Adidas
    model: varchar('model', { length: 100 }).notNull(), // เช่น Pegasus 40
    name: varchar('name', { length: 100 }),             // ชื่อเล่น เช่น "คู่เก่ง"

    currentDistance: doublePrecision('current_distance').default(0), // วิ่งไปกี่โลแล้ว
    maxDistance: integer('max_distance').default(800),               // ระยะแจ้งเตือน (Target)

    isDefault: boolean('is_default').default(false),    // เป็นคู่หลักไหม?
    status: varchar('status', { length: 20 }).default('ACTIVE'), // ACTIVE, RETIRED, DELETED

    createdAt: timestamp('created_at').defaultNow(),
});

// --------------------------------------------------------
// 3. Activities (บันทึกการวิ่ง)
// --------------------------------------------------------
export const activities = pgTable('activities', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    shoeId: integer('shoe_id').references(() => shoes.id), // เชื่อมกับรองเท้า
    type: varchar('type', { length: 50 }).default('RUN'),
    distance: doublePrecision('distance').notNull(),
    duration: integer('duration').notNull(),
    calories: integer('calories').notNull(),
    pace: doublePrecision('pace'),

    routePath: json('route_path'), // เก็บพิกัด GPS เป็น JSON Array

    startTime: timestamp('start_time', { withTimezone: true }).defaultNow(),
    endTime: timestamp('end_time', { withTimezone: true }),
});

// --------------------------------------------------------
// 4. Weekly Goals (เป้าหมายรายสัปดาห์)
// --------------------------------------------------------
export const weeklyGoals = pgTable('weekly_goals', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),

    targetKm: integer('target_km').notNull(),
    currentKm: doublePrecision('current_km').default(0).notNull(),

    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),

    status: varchar('status', { length: 20 }).default('ACTIVE'),
    isCompleted: boolean('is_completed').default(false),

    createdAt: timestamp('created_at').defaultNow(),
});

// --------------------------------------------------------
// 5. Badge System (ระบบเหรียญรางวัล) 🏅 [UPDATED]
// --------------------------------------------------------
export const badges = pgTable('badges', {
    id: serial('id').primaryKey(),

    // ส่วนหน้าตา (Display)
    name: varchar('name', { length: 100 }).notNull(),        // ชื่อเหรียญ
    description: text('description'),                        // คำอธิบาย
    icon: text('icon'),                                    // URL รูปภาพ/Icon (เปลี่ยนจาก icon เป็น image เพื่อให้ตรงกับโค้ด)

    // ส่วนเงื่อนไข (Logic)
    criteriaType: varchar('criteria_type', { length: 50 }).notNull(), // EX: TOTAL_DIST, TOTAL_RUNS
    criteriaValue: integer('criteria_value').notNull(),      // EX: 10, 100

    createdAt: timestamp('created_at').defaultNow(),
});

export const userBadges = pgTable('user_badges', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    badgeId: integer('badge_id').notNull().references(() => badges.id),

    earnedAt: timestamp('earned_at').defaultNow(),
});


// ========================================================
// RELATIONS (ความสัมพันธ์)
// ========================================================

export const usersRelations = relations(users, ({ one, many }) => ({
    profile: one(usersProfile, {
        fields: [users.id],
        references: [usersProfile.userId],
    }),
    activities: many(activities),
    weeklyGoals: many(weeklyGoals), // แก้ชื่อจาก goals เป็น weeklyGoals ให้ชัดเจน
    badges: many(userBadges),
    shoes: many(shoes), // ✅ เพิ่มความสัมพันธ์กับรองเท้า
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
    user: one(users, {
        fields: [activities.userId],
        references: [users.id],
    }),
    shoe: one(shoes, {
        fields: [activities.shoeId],
        references: [shoes.id],
    }),
}));

export const weeklyGoalsRelations = relations(weeklyGoals, ({ one }) => ({
    user: one(users, {
        fields: [weeklyGoals.userId],
        references: [users.id],
    }),
}));

export const shoesRelations = relations(shoes, ({ one, many }) => ({
    user: one(users, {
        fields: [shoes.userId],
        references: [users.id],
    }),
    activities: many(activities),
}));

// ✅ เพิ่ม Relations ของ Badges
export const badgesRelations = relations(badges, ({ many }) => ({
    owners: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
    user: one(users, {
        fields: [userBadges.userId],
        references: [users.id],
    }),
    badge: one(badges, {
        fields: [userBadges.badgeId],
        references: [badges.id],
    }),
}));