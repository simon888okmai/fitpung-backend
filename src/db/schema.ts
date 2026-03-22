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

export const shoes = pgTable('shoes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),

    brand: varchar('brand', { length: 100 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    name: varchar('name', { length: 100 }),

    currentDistance: doublePrecision('current_distance').default(0),
    maxDistance: integer('max_distance').default(800),

    isDefault: boolean('is_default').default(false),
    status: varchar('status', { length: 20 }).default('ACTIVE'),

    createdAt: timestamp('created_at').defaultNow(),
});

export const activities = pgTable('activities', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    shoeId: integer('shoe_id').references(() => shoes.id),
    type: varchar('type', { length: 50 }).default('RUN'),
    distance: doublePrecision('distance').notNull(),
    duration: integer('duration').notNull(),
    calories: integer('calories').notNull(),
    pace: doublePrecision('pace'),

    routePath: json('route_path'),

    startTime: timestamp('start_time', { withTimezone: true }).defaultNow(),
    endTime: timestamp('end_time', { withTimezone: true }),
});

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

export const badges = pgTable('badges', {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    icon: text('icon'),

    criteriaType: varchar('criteria_type', { length: 50 }).notNull(),
    criteriaValue: integer('criteria_value').notNull(),

    createdAt: timestamp('created_at').defaultNow(),
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
    weeklyGoals: many(weeklyGoals),
    badges: many(userBadges),
    shoes: many(shoes),
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