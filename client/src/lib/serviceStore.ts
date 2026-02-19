import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export interface Service {
  id: string;
  mentorId: string;
  title: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
}

interface ServiceState {
  services: Service[];
  addService: (service: Omit<Service, "id">) => void;
  deleteService: (id: string) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  getServicesByMentorId: (mentorId: string) => Service[];
}

// Seed data
const INITIAL_SERVICES: Service[] = [
  {
    id: "1",
    mentorId: "1", // Matches Sarah Jenkins in mockData (assuming we map her to ID 1)
    title: "Portfolio Review",
    description: "Deep dive into your design portfolio. I will provide actionable feedback on layout, typography, and case study structure.",
    price: 150,
    duration: 60,
    category: "Design"
  },
  {
    id: "2",
    mentorId: "1",
    title: "Career Strategy Session",
    description: "Planning your next move in the design industry? Let's chat about agencies vs product companies.",
    price: 80,
    duration: 30,
    category: "Career"
  },
  {
    id: "3",
    mentorId: "2", // David Chen
    title: "System Design Mock Interview",
    description: "Full system design interview practice with real-time feedback. Perfect for L5/L6 interviews.",
    price: 250,
    duration: 60,
    category: "Engineering"
  }
];

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      services: INITIAL_SERVICES,
      addService: (service) => set((state) => ({
        services: [...state.services, { ...service, id: nanoid() }]
      })),
      deleteService: (id) => set((state) => ({
        services: state.services.filter((s) => s.id !== id)
      })),
      updateService: (id, updates) => set((state) => ({
        services: state.services.map((s) => s.id === id ? { ...s, ...updates } : s)
      })),
      getServicesByMentorId: (mentorId) => get().services.filter((s) => s.mentorId === mentorId),
    }),
    {
      name: 'service-storage',
    }
  )
);
