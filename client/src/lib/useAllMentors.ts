import { useMentors, useServices } from "@/hooks/useApi";

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  image: string | null;
  bio: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  expertise: string[];
  availability: string;
}

export function useAllMentors(userId?: number) {
  const { data: apiMentors = [], isLoading } = useMentors(userId);
  const { data: allServices = [] } = useServices();

  const mentors: Mentor[] = apiMentors.map(mentor => {
    const mentorServices = allServices.filter(s => s.mentorId === mentor.id);
    const categories = Array.from(new Set(mentorServices.map(s => s.category)));
    const minPrice = mentorServices.length > 0 
      ? Math.min(...mentorServices.map(s => s.price)) 
      : mentor.hourlyRate || 0;

    const mentorData = mentor as any;
    return {
      id: String(mentor.id),
      name: `${mentor.firstName} ${mentor.lastName}`,
      title: mentor.title || "Mentor",
      company: mentor.company || "Freelance",
      image: mentor.avatar || null,
      bio: mentor.bio || "No bio provided.",
      rating: Number(mentor.rating) || 5.0,
      reviewCount: mentor.reviewCount || 0,
      hourlyRate: minPrice || mentor.hourlyRate || 0,
      expertise: mentorData.expertise && mentorData.expertise.length > 0 
        ? mentorData.expertise 
        : (categories.length > 0 ? categories : ["General Mentorship"]),
      availability: "Available upon request"
    };
  });

  return { mentors, isLoading };
}
