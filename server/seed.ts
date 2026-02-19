import { db } from "./db";
import { users, expertise, services } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SEED_MENTORS = [
  {
    email: "alex.thompson@mentormatch.com",
    password: "mentor123",
    firstName: "Alex",
    lastName: "Thompson",
    role: "mentor" as const,
    title: "Software Engineer",
    company: "Google",
    bio: "I'm a software engineer at Google who loves helping students discover the magic of coding. I'll show you what it's really like to work in tech and help you build your first real-world projects!",
    hourlyRate: 35,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    expertise: ["Coding", "Tech Careers", "Product Building"]
  },
  {
    email: "maya.rodriguez@mentormatch.com",
    password: "mentor123",
    firstName: "Maya",
    lastName: "Rodriguez",
    role: "mentor" as const,
    title: "Marketing Director",
    company: "Nike",
    bio: "Ever wondered how big brands tell their stories? I mentor high schoolers interested in business and creativity, showing you how we bridge the gap between ideas and the real world.",
    hourlyRate: 45,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    expertise: ["Branding", "Creative Strategy", "Business"]
  },
  {
    email: "jordan.kim@mentormatch.com",
    password: "mentor123",
    firstName: "Jordan",
    lastName: "Kim",
    role: "mentor" as const,
    title: "Product Designer",
    company: "Airbnb",
    bio: "I design apps used by millions. I'll mentor you through the process of taking an idea from a sketch to a real product, teaching you the design skills used by pros every day.",
    hourlyRate: 40,
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face",
    expertise: ["App Design", "User Experience", "Prototyping"]
  },
  {
    email: "sarah.chen@mentormatch.com",
    password: "mentor123",
    firstName: "Sarah",
    lastName: "Chen",
    role: "mentor" as const,
    title: "Data Scientist",
    company: "Netflix",
    bio: "I help Netflix understand what shows you'll love next! I mentor students interested in math, data, and using numbers to solve real problems.",
    hourlyRate: 50,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    expertise: ["Data Science", "Mathematics", "Machine Learning"]
  },
  {
    email: "marcus.williams@mentormatch.com",
    password: "mentor123",
    firstName: "Marcus",
    lastName: "Williams",
    role: "mentor" as const,
    title: "Startup Founder",
    company: "TechStart Inc",
    bio: "I started my first company at 22 and sold it at 28. Now I help young entrepreneurs turn their ideas into reality and learn from my mistakes.",
    hourlyRate: 60,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    expertise: ["Entrepreneurship", "Business Strategy", "Fundraising"]
  }
];

const SEED_SERVICES = [
  {
    mentorEmail: "alex.thompson@mentormatch.com",
    title: "Intro to Coding Session",
    description: "Learn the basics of programming in a fun, hands-on session. Perfect for beginners who want to write their first code!",
    price: 35,
    duration: 60,
    category: "Coding"
  },
  {
    mentorEmail: "alex.thompson@mentormatch.com",
    title: "Tech Career Exploration",
    description: "Discover different career paths in tech - from software engineer to product manager. I'll share what a day in my life looks like.",
    price: 25,
    duration: 30,
    category: "Tech Careers"
  },
  {
    mentorEmail: "maya.rodriguez@mentormatch.com",
    title: "Brand Building Workshop",
    description: "Learn how top brands like Nike create their identity. We'll work on building your personal brand too!",
    price: 45,
    duration: 60,
    category: "Branding"
  },
  {
    mentorEmail: "jordan.kim@mentormatch.com",
    title: "Design Your First App",
    description: "Sketch out your app idea and learn the design thinking process used at top tech companies.",
    price: 40,
    duration: 60,
    category: "App Design"
  },
  {
    mentorEmail: "sarah.chen@mentormatch.com",
    title: "Data Science for Beginners",
    description: "See how data tells stories! We'll explore real datasets and discover insights together.",
    price: 50,
    duration: 60,
    category: "Data Science"
  },
  {
    mentorEmail: "marcus.williams@mentormatch.com",
    title: "Startup 101",
    description: "Got a business idea? Let's talk about how to validate it and take the first steps to make it real.",
    price: 60,
    duration: 60,
    category: "Entrepreneurship"
  }
];

export async function seedDatabase() {
  console.log("Seeding database...");
  
  const mentorMap = new Map<string, number>();
  
  for (const mentor of SEED_MENTORS) {
    const existingUser = await db.select().from(users).where(eq(users.email, mentor.email)).limit(1);
    
    if (existingUser.length === 0) {
      const hashedPassword = await bcrypt.hash(mentor.password, 10);
      const [newUser] = await db.insert(users).values({
        email: mentor.email,
        password: hashedPassword,
        firstName: mentor.firstName,
        lastName: mentor.lastName,
        role: mentor.role,
        title: mentor.title,
        company: mentor.company,
        bio: mentor.bio,
        hourlyRate: mentor.hourlyRate,
        avatar: mentor.avatar
      }).returning();
      
      mentorMap.set(mentor.email, newUser.id);
      
      for (const skill of mentor.expertise) {
        await db.insert(expertise).values({
          userId: newUser.id,
          skill: skill
        });
      }
      
      console.log(`Created mentor: ${mentor.firstName} ${mentor.lastName}`);
    } else {
      mentorMap.set(mentor.email, existingUser[0].id);
      console.log(`Mentor already exists: ${mentor.firstName} ${mentor.lastName}`);
    }
  }
  
  for (const service of SEED_SERVICES) {
    const mentorId = mentorMap.get(service.mentorEmail);
    if (mentorId) {
      const existingService = await db.select().from(services).where(and(eq(services.mentorId, mentorId), eq(services.title, service.title))).limit(1);
      
      if (existingService.length === 0) {
        await db.insert(services).values({
          mentorId,
          title: service.title,
          description: service.description,
          price: service.price,
          duration: service.duration,
          category: service.category
        });
        console.log(`Created service: ${service.title}`);
      }
    }
  }
  
  console.log("Database seeding complete!");
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
