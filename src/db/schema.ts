import { pgTable, serial, text, varchar, integer, timestamp, date } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 256 }).notNull().unique(),
    password: text('password').notNull(),
    email: varchar('email', { length: 256 }).notNull().unique(),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const users_profile = pgTable('users_profile', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id).unique(),
    name: varchar('name', { length: 256 }).notNull(),
    date_of_birth: date('date_of_birth').notNull(),
    gender: varchar('gender', { length: 256 }).notNull(),
    height: integer('height').notNull(),
    weight: integer('weight').notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
});