import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, services, bookings, expertise, availability, messages, reviews, insertUserSchema, insertServiceSchema, insertBookingSchema, insertExpertiseSchema, insertAvailabilitySchema, insertMessageSchema, insertReviewSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendBookingConfirmationEmail, sendMeetingReminderEmail, sendVerificationEmail } from "./email";
import crypto from "crypto";
import { z } from "zod";
import { getAuthUrl, getGoogleUserInfo, createOrUpdateGoogleUser, generateJWT, verifyJWT } from "./googleAuth";
import { createGoogleMeetEvent, updateGoogleMeetEvent, deleteGoogleMeetEvent } from "./googleCalendar";

const TOKEN_EXPIRY_HOURS = 24;

const verifyEmailSchema = z.object({
  token: z.string().min(1).max(256)
});

const resendVerificationSchema = z.object({
  email: z.string().email()
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Generate verification token with expiration
      const user = await storage.createUser(validatedData);
      
      // Send welcome email immediately since verification is removed
      sendWelcomeEmail(user.email, user.firstName).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });
      
      // Don't send password back
      const { password, ...userWithoutSensitive } = user;
      res.status(201).json({ 
        ...userWithoutSensitive, 
        message: "Account created successfully!" 
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid verification token format" });
      }
      
      const { token } = parsed.data;
      
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Check if token has expired
      if (user.verificationTokenExpiresAt && new Date() > new Date(user.verificationTokenExpiresAt)) {
        return res.status(400).json({ message: "Verification token has expired. Please request a new one." });
      }
      
      // Mark email as verified and clear token
      await storage.updateUser(user.id, { 
        emailVerified: true, 
        verificationToken: null,
        verificationTokenExpiresAt: null
      });
      
      // Send welcome email now that they're verified
      sendWelcomeEmail(user.email, user.firstName).catch(() => {});
      
      res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const parsed = resendVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      const { email } = parsed.data;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If an account exists with that email, a verification link has been sent." });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Generate new token with expiration
      const newToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      await storage.updateUser(user.id, { 
        verificationToken: newToken,
        verificationTokenExpiresAt: expiresAt
      });
      
      // Send verification email
      sendVerificationEmail(user.email, user.firstName, newToken).catch(() => {});
      
      res.json({ message: "If an account exists with that email, a verification link has been sent." });
    } catch (error) {
      res.status(500).json({ message: "Failed to resend verification" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user has password (might be Google-only user)
      if (!user.password) {
        return res.status(401).json({ message: "Please sign in with Google" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Don't send password back
      const { password: _, verificationToken: __, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Google OAuth Routes
  app.get("/api/auth/google", (req, res) => {
    const role = req.query.role as string || 'mentee';
    const authUrl = getAuthUrl();
    // Store role in session or as state parameter
    res.json({ url: authUrl + `&state=${role}` });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Authorization code is required" });
      }
      
      const role = (state as string || 'mentee') as 'mentor' | 'mentee';
      
      // Exchange code for tokens and get user info
      const { userInfo, tokens } = await getGoogleUserInfo(code);
      
      // Create or update user in database
      const user = await createOrUpdateGoogleUser(userInfo, tokens, role);
      
      // Generate JWT token
      const jwtToken = generateJWT(user);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      res.redirect(`${frontendUrl}/auth/google/success?token=${jwtToken}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      res.redirect(`${frontendUrl}/auth/google/error`);
    }
  });

  app.post("/api/auth/google/token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const decoded = verifyJWT(token);
      if (!decoded) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      // Get full user data
      const user = await storage.getUser((decoded as any).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, verificationToken, ...userWithoutSensitive } = user;
      res.json(userWithoutSensitive);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify token" });
    }
  });

  // User Routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Don't allow updating password or email through this endpoint
      delete updates.password;
      delete updates.email;
      delete updates.id;
      delete updates.createdAt;
      
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/mentors", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      let mentors;
      
      if (userId) {
        mentors = await storage.getRecommendations(userId);
      } else {
        mentors = await storage.getAllMentors();
      }

      const mentorsWithExpertise = await Promise.all(mentors.map(async (mentor) => {
        const exp = await storage.getExpertiseByUserId(mentor.id);
        const { password, ...userWithoutPassword } = mentor;
        return {
          ...userWithoutPassword,
          expertise: exp.map(e => e.skill)
        };
      }));
      res.json(mentorsWithExpertise);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mentors" });
    }
  });

  app.get("/api/mentors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mentor = await storage.getUser(id);
      
      if (!mentor || mentor.role !== "mentor") {
        return res.status(404).json({ message: "Mentor not found" });
      }
      
      const exp = await storage.getExpertiseByUserId(id);
      const mentorServices = await storage.getServicesByMentorId(id);
      const { password, ...mentorWithoutPassword } = mentor;
      
      res.json({
        ...mentorWithoutPassword,
        expertise: exp.map(e => e.skill),
        services: mentorServices
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mentor" });
    }
  });

  // Service Routes
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.get("/api/mentors/:mentorId/services", async (req, res) => {
    try {
      const mentorId = parseInt(req.params.mentorId);
      const services = await storage.getServicesByMentorId(mentorId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error: any) {
      console.error("Service creation error:", error);
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ 
        message: "Failed to create service",
        details: error.message
      });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      delete updates.id;
      
      const service = await storage.updateService(id, updates);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  // Booking Routes
  app.get("/api/bookings/mentor/:mentorId", async (req, res) => {
    try {
      const mentorId = parseInt(req.params.mentorId);
      const bookings = await storage.getBookingsByMentorId(mentorId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/mentee/:menteeId", async (req, res) => {
    try {
      const menteeId = parseInt(req.params.menteeId);
      const bookings = await storage.getBookingsByMenteeId(menteeId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      if (validatedData.menteeId === validatedData.mentorId) {
        return res.status(400).json({ message: "You cannot book a session with yourself." });
      }

      // Check for overlapping bookings for the same mentor
      const mentorBookings = await storage.getBookingsByMentorId(validatedData.mentorId);
      const newStart = new Date(validatedData.scheduledAt).getTime();
      const newEnd = newStart + (validatedData.duration || 30) * 60000;
      
      const hasOverlap = mentorBookings.some(booking => {
        if (booking.status === 'cancelled') return false;
        
        const existingStart = new Date(booking.scheduledAt).getTime();
        const existingEnd = existingStart + (booking.duration || 30) * 60000;
        
        return (newStart < existingEnd && newEnd > existingStart);
      });
      
      if (hasOverlap) {
        return res.status(400).json({ message: "This time slot is already booked. Please choose another time." });
      }

      const booking = await storage.createBooking(validatedData);
      
      // Create Google Meet link and send booking confirmation emails (non-blocking)
      (async () => {
        try {
          const mentee = await storage.getUser(validatedData.menteeId);
          const mentor = await storage.getUser(validatedData.mentorId);
          const service = validatedData.serviceId ? await storage.getService(validatedData.serviceId) : null;
          
          if (mentee && mentor) {
            const serviceName = service?.title || "Mentorship Session";
            const scheduledAt = new Date(validatedData.scheduledAt);
            
            // Try to create Google Meet event if mentor has Google OAuth
            try {
              if (mentor.googleAccessToken) {
                await createGoogleMeetEvent(
                  validatedData.mentorId,
                  validatedData.menteeId,
                  booking.id,
                  scheduledAt,
                  validatedData.duration || 30,
                  serviceName
                );
              }
            } catch (meetError) {
              console.error("Failed to create Google Meet event:", meetError);
              // Continue without Meet link - can be added later
            }
            
            await sendBookingConfirmationEmail(
              mentee.email,
              mentee.firstName,
              mentor.email,
              mentor.firstName,
              serviceName,
              scheduledAt
            );
          }
        } catch (e) {
          console.error("Failed to send booking emails:", e);
        }
      })();
      
      res.status(201).json(booking);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const booking = await storage.updateBookingStatus(id, status);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Expertise Routes
  app.get("/api/users/:userId/expertise", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const expertiseList = await storage.getExpertiseByUserId(userId);
      res.json(expertiseList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expertise" });
    }
  });

  app.post("/api/expertise", async (req, res) => {
    try {
      const validatedData = insertExpertiseSchema.parse(req.body);
      const exp = await storage.addExpertise(validatedData);
      res.status(201).json(exp);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ message: "Failed to add expertise" });
    }
  });

  app.delete("/api/users/:userId/expertise", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await storage.removeExpertiseByUserId(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove expertise" });
    }
  });

  // Availability Routes
  app.get("/api/mentors/:mentorId/availability", async (req, res) => {
    try {
      const mentorId = parseInt(req.params.mentorId);
      const slots = await storage.getAvailabilityByMentorId(mentorId);
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/availability", async (req, res) => {
    try {
      const validatedData = insertAvailabilitySchema.parse(req.body);
      const slot = await storage.createAvailability(validatedData);
      res.status(201).json(slot);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ message: "Failed to create availability slot" });
    }
  });

  app.patch("/api/availability/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      delete updates.id;
      
      const slot = await storage.updateAvailability(id, updates);
      
      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      res.json(slot);
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.delete("/api/availability/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAvailability(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const booking = await storage.updateBookingStatus(id, status);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.patch("/api/bookings/:id/reschedule", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { scheduledAt } = req.body;
      if (!scheduledAt) return res.status(400).json({ message: "Missing scheduledAt" });
      
      const [updated] = await db.update(bookings)
        .set({ 
          scheduledAt: new Date(scheduledAt),
          status: "pending" // Reset to pending when rescheduled
        })
        .where(eq(bookings.id, id))
        .returning();
        
      if (!updated) return res.status(404).json({ message: "Booking not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to reschedule booking" });
    }
  });

  // Message Routes
  app.get("/api/messages/booking/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.mentorId !== userId && booking.menteeId !== userId) {
        return res.status(403).json({ message: "Not authorized to view these messages" });
      }
      
      const chatMessages = await storage.getMessagesByBookingId(bookingId);
      res.json(chatMessages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, bookingId, content } = req.body;
      
      if (!senderId || !bookingId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.mentorId !== senderId && booking.menteeId !== senderId) {
        return res.status(403).json({ message: "Not authorized to send messages in this booking" });
      }
      
      const receiverId = booking.mentorId === senderId ? booking.menteeId : booking.mentorId;
      
      const message = await storage.createMessage({
        senderId,
        receiverId,
        bookingId,
        content
      });
      res.status(201).json(message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Review Routes
  app.get("/api/reviews/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userReviews = await storage.getReviewsByRevieweeId(userId);
      res.json(userReviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      
      // Verify the reviewer is a mentee (only mentees can review mentors)
      const reviewer = await storage.getUser(validatedData.reviewerId);
      if (!reviewer || reviewer.role !== "mentee") {
        return res.status(403).json({ message: "Only mentees can review mentors" });
      }
      
      // Verify the reviewee is a mentor
      const reviewee = await storage.getUser(validatedData.revieweeId);
      if (!reviewee || reviewee.role !== "mentor") {
        return res.status(400).json({ message: "You can only review mentors" });
      }
      
      // Check if user already reviewed this mentor
      const hasReviewed = await storage.hasReviewedMentor(validatedData.reviewerId, validatedData.revieweeId);
      if (hasReviewed) {
        return res.status(400).json({ message: "You have already reviewed this mentor" });
      }
      
      // Verify the reviewer has had a completed session with this mentor
      const hasCompleted = await storage.hasCompletedBookingWith(validatedData.reviewerId, validatedData.revieweeId);
      if (!hasCompleted) {
        return res.status(403).json({ message: "You can only review mentors after completing a session with them" });
      }
      
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/reviews/eligibility/:mentorId/:userId", async (req, res) => {
    try {
      const mentorId = parseInt(req.params.mentorId);
      const userId = parseInt(req.params.userId);
      
      const hasReviewed = await storage.hasReviewedMentor(userId, mentorId);
      const hasCompletedSession = await storage.hasCompletedBookingWith(userId, mentorId);
      
      res.json({ 
        canReview: hasCompletedSession && !hasReviewed,
        hasReviewed,
        hasCompletedSession 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check review eligibility" });
    }
  });

  // Meeting Reminder System - runs every minute to check for upcoming meetings
  const sentReminders = new Set<number>();
  
  async function checkAndSendReminders() {
    try {
      const now = new Date();
      const reminderWindow = 15; // Send reminder 15 minutes before
      
      // Get all upcoming bookings
      const allBookings = await storage.getUpcomingBookings();
      
      for (const booking of allBookings) {
        if (sentReminders.has(booking.id)) continue;
        
        const scheduledAt = new Date(booking.scheduledAt);
        const minutesUntilMeeting = (scheduledAt.getTime() - now.getTime()) / (1000 * 60);
        
        // Send reminder if meeting is within the reminder window
        if (minutesUntilMeeting > 0 && minutesUntilMeeting <= reminderWindow) {
          const mentee = await storage.getUser(booking.menteeId);
          const mentor = await storage.getUser(booking.mentorId);
          const service = booking.serviceId ? await storage.getService(booking.serviceId) : null;
          const serviceName = service?.title || "Mentorship Session";
          
          if (mentee && mentor) {
            // Send to mentee
            await sendMeetingReminderEmail(
              mentee.email,
              mentee.firstName,
              mentor.firstName,
              serviceName,
              scheduledAt,
              false
            );
            
            // Send to mentor
            await sendMeetingReminderEmail(
              mentor.email,
              mentor.firstName,
              mentee.firstName,
              serviceName,
              scheduledAt,
              true
            );
            
            sentReminders.add(booking.id);
          }
        }
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  }
  
  // Check for reminders every minute
  setInterval(checkAndSendReminders, 60000);
  // Also check immediately on startup
  checkAndSendReminders();

  return httpServer;
}
