import { useParams, Link } from "wouter";
import { useAllMentors, Mentor } from "@/lib/useAllMentors";
import { useMentor, useMentorAvailability, useCreateBooking, useReviews, useCreateReview, useReviewEligibility } from "@/hooks/useApi";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Star, Clock, MapPin, Linkedin, Globe, MessageSquare, ShieldCheck, ChevronLeft, User } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format, getDay, parse, addMinutes, isAfter, startOfToday } from "date-fns";
import { useAuth } from "@/lib/authStore";
import confetti from "canvas-confetti";

export default function MentorProfile() {
  const { id } = useParams();
  const mentorId = id ? parseInt(decodeURIComponent(id)) : undefined;
  const { user } = useAuth();
  const { mentors: allMentors, isLoading: mentorsLoading } = useAllMentors();
  const { data: mentorData, isLoading: mentorLoading } = useMentor(mentorId);
  const { data: availability = [] } = useMentorAvailability(mentorId);
  const createBookingMutation = useCreateBooking();
  const { data: reviews = [] } = useReviews(mentorId);
  const createReviewMutation = useCreateReview();
  const { data: eligibility } = useReviewEligibility(mentorId, user?.id);
  
  const mentor = allMentors.find((m: Mentor) => m.id === String(mentorId));
  const allMentorServices = mentorData?.services || [];

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const { toast } = useToast();

  const availableTimes = useMemo(() => {
    if (!date || !availability.length) return [];
    
    const dayOfWeek = getDay(date);
    const daySlots = availability.filter(slot => slot.dayOfWeek === dayOfWeek && slot.isActive);
    
    const times: string[] = [];
    const today = startOfToday();
    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    const now = new Date();

    daySlots.forEach(slot => {
      let current = parse(slot.startTime, 'HH:mm', date);
      const end = parse(slot.endTime, 'HH:mm', date);
      
      while (current < end) {
        const timeStr = format(current, 'HH:mm');
        // Only show future times if it's today
        if (!isToday || isAfter(current, now)) {
          times.push(timeStr);
        }
        current = addMinutes(current, 30); // 30 min intervals
      }
    });
    
    return times.sort();
  }, [date, availability]);

  if (mentorsLoading || mentorLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!mentor) return <div className="min-h-screen flex items-center justify-center">Mentor not found</div>;

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a session.",
        variant: "destructive"
      });
      return;
    }

    if (user.id === mentorId) {
      toast({
        title: "Booking Error",
        description: "You cannot book yourself for a mentorship session. That wouldn't be very kind!",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTime || !date) {
      toast({
        title: "Selection Required",
        description: "Please select a date and time slot for your session.",
        variant: "destructive"
      });
      return;
    }

    const scheduledAt = parse(selectedTime, 'HH:mm', date);
    const selectedService = allMentorServices.find(s => s.id === selectedServiceId) || allMentorServices[0];

    try {
      await createBookingMutation.mutateAsync({
        mentorId: mentorId!,
        menteeId: user.id,
        serviceId: selectedService?.id || null,
        scheduledAt: scheduledAt.toISOString(),
        duration: 30,
        notes: "",
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#d946ef', '#ffffff']
      });

      toast({
        title: "Booking Confirmed!",
        description: `Your session with ${mentor.name} is scheduled for ${format(date, 'PPP')} at ${selectedTime}.`,
      });
      setSelectedTime(null);
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Could not complete the booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReview = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to leave a review.",
        variant: "destructive"
      });
      return;
    }

    if (!mentorId) return;

    try {
      await createReviewMutation.mutateAsync({
        reviewerId: user.id,
        revieweeId: mentorId,
        rating: reviewRating,
        comment: reviewComment || undefined
      });

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
      setReviewComment("");
      setReviewRating(5);
    } catch (error: any) {
      toast({
        title: "Review Failed",
        description: error.message || "Could not submit review. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Link href="/marketplace">
          <a className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Mentors
          </a>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 border-4 border-background shadow-xl bg-gradient-to-br from-cyan-400 to-magenta-400 flex items-center justify-center">
                <User className="w-16 h-16 text-white/80 drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold mb-2">{mentor.name}</h1>
                <p className="text-xl text-muted-foreground mb-4">{mentor.title} at <span className="text-foreground font-medium">{mentor.company}</span></p>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-foreground">{mentor.rating}</span> ({mentor.reviewCount} reviews)
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> San Francisco, CA (Remote)
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Responds in 24h
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="services" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                 {allMentorServices.length > 0 ? (
                    allMentorServices.map(service => (
                      <Card key={service.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                             <div>
                               <Badge variant="secondary" className="mb-2">{service.category}</Badge>
                               <CardTitle className="text-xl">{service.title}</CardTitle>
                             </div>
                             <div className="text-right">
                               <div className="text-2xl font-bold">${service.price}</div>
                               <div className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                                 <Clock className="w-3 h-3" /> {service.duration}m
                               </div>
                             </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{service.description}</p>
                        </CardContent>
                        <CardFooter>
                           <Button 
                             className="w-full sm:w-auto" 
                             variant={selectedServiceId === service.id ? "default" : "secondary"}
                             onClick={() => {
                               setSelectedServiceId(service.id);
                               toast({
                                 title: "Service Selected",
                                 description: `${service.title} selected for booking.`,
                               });
                             }}
                           >
                             {selectedServiceId === service.id ? "Selected" : "Select Service"}
                           </Button>
                        </CardFooter>
                      </Card>
                    ))
                 ) : (
                    <div className="text-center py-12 bg-muted/20 rounded-xl border-dashed border-2">
                      <p className="text-muted-foreground">This mentor hasn't listed any specific services yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">You can still request a custom session using the calendar.</p>
                    </div>
                 )}
              </TabsContent>

              <TabsContent value="about" className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <section>
                  <h3 className="font-heading font-bold text-xl mb-4">Biography</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {mentor.bio}
                    <br /><br />
                    I believe in practical, actionable advice. In our sessions, we can dive deep into technical challenges, discuss career navigation, or roleplay difficult conversations.
                  </p>
                </section>

                <section>
                  <h3 className="font-heading font-bold text-xl mb-4">Areas of Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {mentor.expertise.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </section>
                
                <section>
                  <h3 className="font-heading font-bold text-xl mb-4">What Mentees Say</h3>
                  <div className="grid gap-4">
                     {[1, 2].map(i => (
                       <Card key={i} className="p-4 bg-muted/20 border-border/50">
                         <div className="flex gap-3 items-start">
                           <Avatar className="w-10 h-10">
                             <AvatarImage src={`https://i.pravatar.cc/100?img=${i + 20}`} />
                             <AvatarFallback>U</AvatarFallback>
                           </Avatar>
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                               <span className="font-bold text-sm">Alex M.</span>
                               <div className="flex text-yellow-400">
                                 {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                               </div>
                             </div>
                             <p className="text-sm text-muted-foreground">"Absolutely game-changing advice. {mentor.name} helped me negotiate a 20% raise and clear up my career goals."</p>
                           </div>
                         </div>
                       </Card>
                     ))}
                  </div>
                </section>
              </TabsContent>
              
              <TabsContent value="reviews" className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                {user && user.id !== mentorId && eligibility?.canReview && (
                  <Card className="p-6 bg-muted/20">
                    <h3 className="font-heading font-bold text-lg mb-4">Leave a Review</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                              data-testid={`rating-star-${star}`}
                            >
                              <Star
                                className={`w-6 h-6 ${star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Comment (optional)</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience with this mentor..."
                          className="w-full min-h-[100px] p-3 rounded-md border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          data-testid="review-comment"
                        />
                      </div>
                      <Button 
                        onClick={handleReview} 
                        disabled={createReviewMutation.isPending}
                        data-testid="submit-review"
                      >
                        {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </Card>
                )}
                
                {user && user.id !== mentorId && eligibility && !eligibility.canReview && (
                  <Card className="p-4 bg-muted/10 border-dashed">
                    <p className="text-sm text-muted-foreground text-center">
                      {eligibility.hasReviewed 
                        ? "You've already reviewed this mentor."
                        : "Complete a session with this mentor to leave a review."}
                    </p>
                  </Card>
                )}
                
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <Card key={review.id} className="p-4 bg-muted/20 border-border/50" data-testid={`review-${review.id}`}>
                        <div className="flex gap-3 items-start">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={review.reviewerAvatar || undefined} />
                            <AvatarFallback>{review.reviewerName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{review.reviewerName}</span>
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-muted-foreground'}`} 
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(review.createdAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No reviews yet. Be the first to leave a review!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Sidebar */}
          <div className="relative">
            <div className="sticky top-24 space-y-4">
              <Card className="p-6 border-primary/20 shadow-lg shadow-primary/5">
                <h3 className="font-heading font-bold text-xl mb-6">Book a Session</h3>
                
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-border">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span className="text-2xl font-bold">${mentor.hourlyRate}</span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="rounded-md border p-3 bg-background overflow-hidden">
                     <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="w-full"
                      />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.length > 0 ? (
                      availableTimes.map(time => (
                        <Button 
                          key={time} 
                          variant={selectedTime === time ? "default" : "outline"} 
                          className="text-xs hover:border-primary hover:text-primary"
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-4 text-xs text-muted-foreground">
                        No availability for this date
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20" 
                  onClick={handleBooking}
                >
                  Confirm Booking
                </Button>
                
                <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 99% Satisfaction Guarantee
                </p>
              </Card>

              <div className="flex justify-center gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Linkedin className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Globe className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
