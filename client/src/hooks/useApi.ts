import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/authStore";

export interface Service {
  id: number;
  mentorId: number;
  title: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  createdAt?: string;
}

export interface Booking {
  id: number;
  mentorId: number;
  menteeId: number;
  serviceId: number | null;
  scheduledAt: string;
  duration: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string | null;
  meetLink?: string | null;
  googleEventId?: string | null;
  createdAt?: string;
  menteeName?: string;
  menteeAvatar?: string | null;
  mentorName?: string;
  mentorAvatar?: string | null;
  serviceTitle?: string;
}

export interface Expertise {
  id: number;
  userId: number;
  skill: string;
}

export interface Availability {
  id: number;
  mentorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface MentorWithExpertise extends Omit<User, 'password'> {
  expertise: string[];
}

export const useMentors = (userId?: number) => {
  return useQuery<MentorWithExpertise[]>({
    queryKey: ['mentors', userId],
    queryFn: async () => {
      const url = userId ? `/api/mentors?userId=${userId}` : '/api/mentors';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch mentors');
      return response.json();
    }
  });
};

export const useMentor = (id: number | undefined) => {
  return useQuery<MentorWithExpertise & { services: Service[] }>({
    queryKey: ['mentor', id],
    queryFn: async () => {
      const response = await fetch(`/api/mentors/${id}`);
      if (!response.ok) throw new Error('Failed to fetch mentor');
      return response.json();
    },
    enabled: !!id
  });
};

export const useServices = () => {
  return useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    }
  });
};

export const useMentorServices = (mentorId: number | undefined) => {
  return useQuery<Service[]>({
    queryKey: ['services', 'mentor', mentorId],
    queryFn: async () => {
      const response = await fetch(`/api/mentors/${mentorId}/services`);
      if (!response.ok) throw new Error('Failed to fetch mentor services');
      return response.json();
    },
    enabled: !!mentorId
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (service: Omit<Service, 'id' | 'createdAt'>) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create service');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Service> }) => {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update service');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete service');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<User> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
    }
  });
};

export const useUserExpertise = (userId: number | undefined) => {
  return useQuery<Expertise[]>({
    queryKey: ['expertise', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/expertise`);
      if (!response.ok) throw new Error('Failed to fetch expertise');
      return response.json();
    },
    enabled: !!userId
  });
};

export const useAddExpertise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expertise: { userId: number, skill: string }) => {
      const response = await fetch('/api/expertise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expertise)
      });
      if (!response.ok) throw new Error('Failed to add expertise');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expertise', variables.userId] });
    }
  });
};

export const useMenteeBookings = (menteeId: number | undefined) => {
  return useQuery<Booking[]>({
    queryKey: ['bookings', 'mentee', menteeId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/mentee/${menteeId}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
    enabled: !!menteeId
  });
};

export const useMentorBookings = (mentorId: number | undefined) => {
  return useQuery<Booking[]>({
    queryKey: ['bookings', 'mentor', mentorId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/mentor/${mentorId}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
    enabled: !!mentorId
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useMentorAvailability = (mentorId: number | undefined) => {
  return useQuery<Availability[]>({
    queryKey: ['availability', mentorId],
    queryFn: async () => {
      const response = await fetch(`/api/mentors/${mentorId}/availability`);
      if (!response.ok) throw new Error('Failed to fetch availability');
      return response.json();
    },
    enabled: !!mentorId
  });
};

export const useCreateAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (slot: Omit<Availability, 'id'>) => {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create availability slot');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    }
  });
};

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Availability> }) => {
      const response = await fetch(`/api/availability/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update availability');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    }
  });
};

export const useDeleteAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/availability/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete availability');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    }
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: Booking['status'] }) => {
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update booking status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useRescheduleBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: number, scheduledAt: string }) => {
      const response = await fetch(`/api/bookings/${id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt })
      });
      if (!response.ok) throw new Error('Failed to reschedule booking');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

export const useDeleteUser = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
    }
  });
};

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  bookingId: number | null;
  content: string;
  createdAt: string;
}

export const useBookingMessages = (bookingId: number | undefined, userId: number | undefined) => {
  return useQuery<ChatMessage[]>({
    queryKey: ['messages', 'booking', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/booking/${bookingId}?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!bookingId && !!userId,
    refetchInterval: 3000
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (message: { senderId: number; receiverId: number; bookingId: number; content: string }) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'booking', variables.bookingId] });
    }
  });
};

export interface Review {
  id: number;
  reviewerId: number;
  revieweeId: number;
  bookingId: number | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerAvatar: string | null;
}

export const useReviews = (userId: number | undefined) => {
  return useQuery<Review[]>({
    queryKey: ['reviews', userId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    enabled: !!userId
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (review: { reviewerId: number; revieweeId: number; bookingId?: number; rating: number; comment?: string }) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create review');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.revieweeId] });
      queryClient.invalidateQueries({ queryKey: ['reviewEligibility', variables.revieweeId, variables.reviewerId] });
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
      queryClient.invalidateQueries({ queryKey: ['mentor', variables.revieweeId] });
    }
  });
};

export const useReviewEligibility = (mentorId: number | undefined, userId: number | undefined) => {
  return useQuery<{ canReview: boolean; hasReviewed: boolean; hasCompletedSession: boolean }>({
    queryKey: ['reviewEligibility', mentorId, userId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/eligibility/${mentorId}/${userId}`);
      if (!response.ok) throw new Error('Failed to check review eligibility');
      return response.json();
    },
    enabled: !!mentorId && !!userId
  });
};
