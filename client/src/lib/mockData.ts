import creativeDirector from '@assets/generated_images/portrait_of_creative_director_mentor.png';
import softwareEngineer from '@assets/generated_images/portrait_of_software_engineer_mentor.png';
import startupFounder from '@assets/generated_images/portrait_of_startup_founder_mentor.png';

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  image: string;
  bio: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  expertise: string[];
  availability: string;
}

export const MENTORS: Mentor[] = [
  {
    id: "1",
    name: "Alex Thompson",
    title: "Software Engineer",
    company: "Google",
    image: creativeDirector,
    bio: "I'm a software engineer at Google who loves helping students discover the magic of coding. I'll show you what it's really like to work in tech and help you build your first real-world projects! 🎯",
    rating: 4.9,
    reviewCount: 248,
    hourlyRate: 35,
    expertise: ["Coding", "Tech Careers", "Product Building"],
    availability: "Available today",
  },
  {
    id: "2",
    name: "Maya Rodriguez",
    title: "Marketing Director",
    company: "Nike",
    image: softwareEngineer,
    bio: "Ever wondered how big brands tell their stories? I mentor high schoolers interested in business and creativity, showing you how we bridge the gap between ideas and the real world. ✨",
    rating: 5.0,
    reviewCount: 167,
    hourlyRate: 45,
    expertise: ["Branding", "Creative Strategy", "Business"],
    availability: "Next slot: Tomorrow",
  },
  {
    id: "3",
    name: "Jordan Kim",
    title: "Product Designer",
    company: "Airbnb",
    image: startupFounder,
    bio: "I design apps used by millions. I'll mentor you through the process of taking an idea from a sketch to a real product, teaching you the design skills used by pros every day. 🚀",
    rating: 4.8,
    reviewCount: 312,
    hourlyRate: 40,
    expertise: ["App Design", "User Experience", "Prototyping"],
    availability: "Limited spots left",
  },
  {
    id: "4",
    name: "Sarah Chen",
    title: "Writing & Humanities Mentor",
    company: "Yale University",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    bio: "I'm passionate about helping young writers find their voice. From creative writing to debating big ideas, I'll mentor you to become a confident communicator. 📚",
    rating: 4.9,
    reviewCount: 189,
    hourlyRate: 30,
    expertise: ["Creative Writing", "Public Speaking", "Social Sciences", "Debate"],
    availability: "Available this week",
  },
  {
    id: "5",
    name: "Marcus Williams",
    title: "Biology & Research Mentor",
    company: "MIT Student",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    bio: "Ever wondered what it's like to work in a lab? I mentor students interested in the life sciences, helping them explore biology and understand the path to becoming a scientist. 🧪",
    rating: 4.7,
    reviewCount: 134,
    hourlyRate: 35,
    expertise: ["Biology", "Life Sciences", "Science Fairs", "Research"],
    availability: "Available Today",
  }
];

export const TOPICS = [
  "STEM", "Writing", "Tech", "College Prep", "Arts", "Leadership", "Future Careers", "Study Skills"
];
