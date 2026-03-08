import { users, services, bookings, expertise, availability, messages, reviews, type User, type InsertUser, type Service, type InsertService, type Booking, type InsertBooking, type Expertise, type InsertExpertise, type Availability, type InsertAvailability, type Message, type InsertMessage, type Review, type InsertReview, type ReviewWithReviewer } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithToken(user: InsertUser, token: string, expiresAt: Date): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllMentors(): Promise<User[]>;
  getRecommendations(userId: number): Promise<User[]>;
  
  // Service methods
  getService(id: number): Promise<Service | undefined>;
  getServicesByMentorId(mentorId: number): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  deleteService(id: number): Promise<boolean>;
  
  // Booking methods
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByMentorId(mentorId: number): Promise<Booking[]>;
  getBookingsByMenteeId(menteeId: number): Promise<Booking[]>;
  getUpcomingBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, updates: Partial<Omit<Booking, 'id' | 'createdAt'>>): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled"): Promise<Booking | undefined>;
  
  // Expertise methods
  getExpertiseByUserId(userId: number): Promise<Expertise[]>;
  addExpertise(expertise: InsertExpertise): Promise<Expertise>;
  removeExpertiseByUserId(userId: number): Promise<void>;
  
  // Availability methods
  getAvailabilityByMentorId(mentorId: number): Promise<Availability[]>;
  createAvailability(slot: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, updates: Partial<Omit<Availability, 'id'>>): Promise<Availability | undefined>;
  deleteAvailability(id: number): Promise<boolean>;
  
  // Message methods
  getMessagesByBookingId(bookingId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Review methods
  getReviewsByRevieweeId(revieweeId: number): Promise<ReviewWithReviewer[]>;
  createReview(review: InsertReview): Promise<Review>;
  hasReviewedBooking(reviewerId: number, bookingId: number): Promise<boolean>;
  hasCompletedBookingWith(menteeId: number, mentorId: number): Promise<boolean>;
  hasReviewedMentor(reviewerId: number, revieweeId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async createUserWithToken(insertUser: InsertUser, token: string, expiresAt: Date): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ 
        ...insertUser, 
        password: hashedPassword, 
        verificationToken: token, 
        verificationTokenExpiresAt: expiresAt,
        emailVerified: false 
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllMentors(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "mentor"));
  }

  async getRecommendations(userId: number): Promise<User[]> {
    const user = await this.getUser(userId);
    if (!user || !user.interests || user.interests.length === 0) {
      return this.getAllMentors();
    }

    // Basic recommendation: Match mentor expertise with user interests
    const mentors = await this.getAllMentors();
    const mentorsWithExp = await Promise.all(mentors.map(async (mentor) => {
      const exp = await this.getExpertiseByUserId(mentor.id);
      return { ...mentor, expertise: exp.map(e => e.skill) };
    }));

    return mentorsWithExp
      .map(mentor => {
        const score = mentor.expertise.filter(skill => 
          user.interests?.some(interest => 
            skill.toLowerCase().includes(interest.toLowerCase()) || 
            interest.toLowerCase().includes(skill.toLowerCase())
          )
        ).length;
        return { mentor, score };
      })
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0 || mentors.length <= 5)
      .map(item => item.mentor);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServicesByMentorId(mentorId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.mentorId, mentorId));
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id)).returning();
    return result.length > 0;
  }

  async updateService(id: number, updates: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(updates).where(eq(services.id, id)).returning();
    return updated;
  }

  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByMentorId(mentorId: number): Promise<any[]> {
    return await db
      .select({
        id: bookings.id,
        mentorId: bookings.mentorId,
        menteeId: bookings.menteeId,
        serviceId: bookings.serviceId,
        scheduledAt: bookings.scheduledAt,
        duration: bookings.duration,
        status: bookings.status,
        notes: bookings.notes,
        meetLink: bookings.meetLink,
        googleEventId: bookings.googleEventId,
        createdAt: bookings.createdAt,
        menteeName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        menteeAvatar: users.avatar,
        serviceTitle: services.title,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.menteeId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.mentorId, mentorId));
  }

  async getBookingsByMenteeId(menteeId: number): Promise<any[]> {
    return await db
      .select({
        id: bookings.id,
        mentorId: bookings.mentorId,
        menteeId: bookings.menteeId,
        serviceId: bookings.serviceId,
        scheduledAt: bookings.scheduledAt,
        duration: bookings.duration,
        status: bookings.status,
        notes: bookings.notes,
        meetLink: bookings.meetLink,
        googleEventId: bookings.googleEventId,
        createdAt: bookings.createdAt,
        mentorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        mentorAvatar: users.avatar,
        serviceTitle: services.title,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.mentorId, users.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.menteeId, menteeId));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const bookingData = {
      ...booking,
      scheduledAt: typeof booking.scheduledAt === 'string' 
        ? new Date(booking.scheduledAt) 
        : booking.scheduledAt
    };
    const [newBooking] = await db.insert(bookings).values(bookingData).returning();
    return newBooking;
  }

  async updateBooking(id: number, updates: Partial<Omit<Booking, 'id' | 'createdAt'>>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async updateBookingStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled"): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async getUpcomingBookings(): Promise<Booking[]> {
    const now = new Date();
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.scheduledAt, now),
          eq(bookings.status, "confirmed")
        )
      );
  }

  // Expertise methods
  async getExpertiseByUserId(userId: number): Promise<Expertise[]> {
    return await db.select().from(expertise).where(eq(expertise.userId, userId));
  }

  async addExpertise(newExpertise: InsertExpertise): Promise<Expertise> {
    const [exp] = await db.insert(expertise).values(newExpertise).returning();
    return exp;
  }

  async removeExpertiseByUserId(userId: number): Promise<void> {
    await db.delete(expertise).where(eq(expertise.userId, userId));
  }

  // Availability methods
  async getAvailabilityByMentorId(mentorId: number): Promise<Availability[]> {
    return await db.select().from(availability).where(eq(availability.mentorId, mentorId));
  }

  async createAvailability(slot: InsertAvailability): Promise<Availability> {
    const [newSlot] = await db.insert(availability).values(slot).returning();
    return newSlot;
  }

  async updateAvailability(id: number, updates: Partial<Omit<Availability, 'id'>>): Promise<Availability | undefined> {
    const [slot] = await db
      .update(availability)
      .set(updates)
      .where(eq(availability.id, id))
      .returning();
    return slot || undefined;
  }

  async deleteAvailability(id: number): Promise<boolean> {
    const result = await db.delete(availability).where(eq(availability.id, id)).returning();
    return result.length > 0;
  }

  async getMessagesByBookingId(bookingId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.bookingId, bookingId));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getReviewsByRevieweeId(revieweeId: number): Promise<ReviewWithReviewer[]> {
    return await db
      .select({
        id: reviews.id,
        reviewerId: reviews.reviewerId,
        revieweeId: reviews.revieweeId,
        bookingId: reviews.bookingId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        reviewerAvatar: users.avatar,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.revieweeId, revieweeId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update user's rating and review count
    const allReviews = await db.select().from(reviews).where(eq(reviews.revieweeId, review.revieweeId));
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
    await db.update(users).set({
      rating: String(avgRating.toFixed(2)),
      reviewCount: allReviews.length
    }).where(eq(users.id, review.revieweeId));
    
    return newReview;
  }

  async hasCompletedBookingWith(menteeId: number, mentorId: number): Promise<boolean> {
    const [booking] = await db.select().from(bookings).where(
      and(
        eq(bookings.menteeId, menteeId),
        eq(bookings.mentorId, mentorId),
        eq(bookings.status, "completed")
      )
    );
    return !!booking;
  }

  async hasReviewedMentor(reviewerId: number, revieweeId: number): Promise<boolean> {
    const [existing] = await db.select().from(reviews).where(
      and(eq(reviews.reviewerId, reviewerId), eq(reviews.revieweeId, revieweeId))
    );
    return !!existing;
  }

  async hasReviewedBooking(reviewerId: number, bookingId: number): Promise<boolean> {
    const [existing] = await db.select().from(reviews).where(
      and(eq(reviews.reviewerId, reviewerId), eq(reviews.bookingId, bookingId))
    );
    return !!existing;
  }
}

export const storage = new DatabaseStorage();
