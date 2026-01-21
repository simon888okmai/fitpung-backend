import { pgTable, serial, text, varchar, integer, timestamp, date, doublePrecision, boolean, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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

export const activities = pgTable('activities', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),

    type: varchar('type', { length: 50 }).default('RUN'),
    distance: doublePrecision('distance').notNull(),
    duration: integer('duration').notNull(),
    calories: integer('calories').notNull(),
    pace: doublePrecision('pace'),

    routePath: json('route_path'),

    startTime: timestamp('start_time').defaultNow(),
    endTime: timestamp('end_time'),
});

export const weeklyGoals = pgTable('weekly_goals', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),

    targetKm: integer('target_km').notNull(),
    currentKm: doublePrecision('current_km').default(0),

    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),

    status: varchar('status', { length: 20 }).default('ACTIVE'),
    isCompleted: boolean('is_completed').default(false),

    createdAt: timestamp('created_at').defaultNow(),
});

export const badges = pgTable('badges', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).unique().notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 255 }),

    conditionType: varchar('condition_type', { length: 50 }),
    conditionValue: integer('condition_value'),
});

export const userBadges = pgTable('user_badges', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    badgeId: integer('badge_id').notNull().references(() => badges.id),

    earnedAt: timestamp('earned_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
    profile: one(usersProfile, {
        fields: [users.id],
        references: [usersProfile.userId],
    }),
    activities: many(activities),
    goals: many(weeklyGoals),
    badges: many(userBadges),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
    user: one(users, {
        fields: [activities.userId],
        references: [users.id],
    }),
}));

export const weeklyGoalsRelations = relations(weeklyGoals, ({ one }) => ({
    user: one(users, {
        fields: [weeklyGoals.userId],
        references: [users.id],
    }),
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