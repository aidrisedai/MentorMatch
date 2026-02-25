import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().$type<"mentor" | "mentee">(),
  avatar: text("avatar"),
  bio: text("bio"),
  title: text("title"),
  company: text("company"),
  hourlyRate: integer("hourly_rate"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  reviewCount: integer("review_count").default(0),
  emailVerified: boolean("email_verified").default(true).notNull(),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  interests: text("interests").array(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8).superRefine((val, ctx) => {
    const hasLowercase = /[a-z]/.test(val);
    const hasUppercase = /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);
    const hasSymbol = /[^A-Za-z0-9]/.test(val);
    
    const count = [hasLowercase, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length;
    
    if (count < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must contain at least 3 of: lowercase, uppercase, number, symbol",
      });
    }
  }),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["mentor", "mentee"]),
}).omit({ id: true, createdAt: true, rating: true, reviewCount: true, emailVerified: true, verificationToken: true, verificationTokenExpiresAt: true });

export const selectUserSchema = createSelectSchema(users);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  duration: integer("duration").notNull().default(30),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceSchema = createInsertSchema(services, {
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  duration: z.number().min(15),
  category: z.string().min(1),
}).omit({ id: true, createdAt: true });

export const selectServiceSchema = createSelectSchema(services);

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  menteeId: integer("mentee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30),
  status: text("status").notNull().$type<"pending" | "confirmed" | "completed" | "cancelled">().default("pending"),
  notes: text("notes"),
  meetLink: text("meet_link"),
  googleEventId: text("google_event_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings, {
  scheduledAt: z.string().or(z.date()),
  duration: z.number().min(15),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
}).omit({ id: true, createdAt: true });

export const selectBookingSchema = createSelectSchema(bookings);

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export const expertise = pgTable("expertise", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skill: text("skill").notNull(),
});

export const insertExpertiseSchema = createInsertSchema(expertise).omit({ id: true });
export type InsertExpertise = z.infer<typeof insertExpertiseSchema>;
export type Expertise = typeof expertise.$inferSelect;

export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertAvailabilitySchema = createInsertSchema(availability, {
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}).omit({ id: true });

export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availability.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1),
}).omit({ id: true, createdAt: true });

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  revieweeId: integer("reviewee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
}).omit({ id: true, createdAt: true });

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export interface ReviewWithReviewer extends Review {
  reviewerName: string;
  reviewerAvatar: string | null;
}
