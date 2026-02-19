import { Calendar, Clock, CreditCard, Plus, Trash2, Edit2, User, MessageCircle, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/authStore";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMentorServices, useCreateService, useUpdateService, useDeleteService, useUpdateUser, useDeleteUser, useMentorBookings, useMenteeBookings, useMentorAvailability, useCreateAvailability, useDeleteAvailability, useBookingMessages, useSendMessage, useUpdateBookingStatus, useRescheduleBooking, type Availability } from "@/hooks/useApi";
import { ScrollArea } from "@/components/ui/scroll-area";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Dashboard() {
  const { user, isAuthenticated, updateUserProfile, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [isAddAvailabilityOpen, setIsAddAvailabilityOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("1");
  const [chatSession, setChatSession] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [reschedulingSession, setReschedulingSession] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  
  const { data: myServices = [], isLoading: servicesLoading } = useMentorServices(user?.id);
  const { data: myAvailability = [] } = useMentorAvailability(user?.id);
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const createAvailabilityMutation = useCreateAvailability();
  const deleteAvailabilityMutation = useDeleteAvailability();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const sendMessageMutation = useSendMessage();
  const updateBookingStatusMutation = useUpdateBookingStatus();
  const rescheduleBookingMutation = useRescheduleBooking();
  const { data: bookings = [] } = user?.role === 'mentor' 
    ? useMentorBookings(user?.id)
    : useMenteeBookings(user?.id);
  const { data: chatMessages = [] } = useBookingMessages(chatSession?.id, user?.id);

  // Calculate statistics
  const totalSessions = bookings.length;
  const completedSessions = bookings.filter(b => b.status === 'completed' || (new Date(b.scheduledAt).getTime() + (b.duration || 30) * 60000 < new Date().getTime() && b.status !== 'cancelled')).length;
  const totalHours = bookings
    .filter(b => b.status === 'completed' || (new Date(b.scheduledAt).getTime() + (b.duration || 30) * 60000 < new Date().getTime() && b.status !== 'cancelled'))
    .reduce((acc, curr) => acc + (curr.duration || 30), 0) / 60;
  
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") || "sessions";

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthenticated, setLocation]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const form = e.target as HTMLFormElement;
    const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value;
    const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value;
    const avatar = (form.elements.namedItem('avatar') as HTMLInputElement).value;
    const bio = (form.elements.namedItem('bio') as HTMLTextAreaElement).value;
    const title = (form.elements.namedItem('title') as HTMLInputElement)?.value;
    const company = (form.elements.namedItem('company') as HTMLInputElement)?.value;
    const interests = (form.elements.namedItem('interests') as HTMLInputElement)?.value.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const updatedUser = await updateUserMutation.mutateAsync({
        id: user.id,
        updates: { firstName, lastName, avatar, bio, title, company, interests }
      });
      updateUserProfile(updatedUser);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('serviceTitle') as HTMLInputElement).value;
    const description = (form.elements.namedItem('serviceDescription') as HTMLTextAreaElement).value;
    const price = Number((form.elements.namedItem('servicePrice') as HTMLInputElement).value);
    const duration = 30;
    const category = (form.elements.namedItem('serviceCategory') as HTMLInputElement).value;

    try {
      if (editingService) {
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          updates: { title, description, price, duration, category }
        });
        toast({
          title: "Service Updated",
          description: "Your listing has been updated successfully."
        });
      } else {
        await createServiceMutation.mutateAsync({
          mentorId: user.id,
          title,
          description,
          price,
          duration,
          category
        });
        toast({
          title: "Service Added",
          description: "Your new listing is now active."
        });
      }

      setIsAddServiceOpen(false);
      setEditingService(null);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.message || "Could not create service. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    try {
      await deleteServiceMutation.mutateAsync(serviceId);
      toast({
        title: "Service Deleted",
        description: "The listing has been removed."
      });
    } catch (error) {
      toast({
        title: "Failed",
        description: "Could not delete service. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const form = e.target as HTMLFormElement;
    const dayOfWeek = Number(selectedDay);
    const startTime = (form.elements.namedItem('startTime') as HTMLInputElement).value;
    const endTime = (form.elements.namedItem('endTime') as HTMLInputElement).value;

    if (startTime >= endTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createAvailabilityMutation.mutateAsync({
        mentorId: user.id,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true
      });

      setIsAddAvailabilityOpen(false);
      form.reset();
      toast({
        title: "Availability Added",
        description: "Your available time slot has been saved."
      });
    } catch (error) {
      toast({
        title: "Failed",
        description: "Could not add availability. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAvailability = async (id: number) => {
    try {
      await deleteAvailabilityMutation.mutateAsync(id);
      toast({
        title: "Availability Removed",
        description: "The time slot has been deleted."
      });
    } catch (error) {
      toast({
        title: "Failed",
        description: "Could not remove availability. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !chatSession || !user) return;
    
    const receiverId = user.role === 'mentor' ? chatSession.menteeId : chatSession.mentorId;
    
    try {
      await sendMessageMutation.mutateAsync({
        senderId: user.id,
        receiverId,
        bookingId: chatSession.id,
        content: chatMessage.trim()
      });
      setChatMessage("");
    } catch (error) {
      toast({
        title: "Failed",
        description: "Could not send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      await updateBookingStatusMutation.mutateAsync({ id, status: 'cancelled' });
      toast({
        title: "Session Cancelled",
        description: "The mentorship session has been cancelled."
      });
    } catch (error) {
      toast({
        title: "Failed",
        description: "Could not cancel session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReschedule = async () => {
    if (!reschedulingSession || !rescheduleDate || !rescheduleTime) return;
    
    try {
      const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
      await rescheduleBookingMutation.mutateAsync({ 
        id: reschedulingSession.id, 
        scheduledAt 
      });
      setReschedulingSession(null);
      toast({
        title: "Session Rescheduled",
        description: "A reschedule request has been sent."
      });
    } catch (error) {
      toast({
        title: "Failed",
        description: "Could not reschedule session. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
           <Avatar className="w-20 h-20 border-4 border-background shadow-sm">
             <AvatarImage src={user.avatar || undefined} />
             <AvatarFallback className="text-xl">
               <User className="w-10 h-10 text-muted-foreground" />
             </AvatarFallback>
           </Avatar>
           <div>
             <h1 className="text-3xl font-heading font-bold">{user.firstName} {user.lastName}</h1>
             <div className="flex items-center gap-2 text-muted-foreground">
                <p className="capitalize">{user.role}</p>
                {user.title && <span>• {user.title}</span>}
                {user.company && <span>at {user.company}</span>}
             </div>
           </div>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
            {user.role === 'mentor' && <TabsTrigger value="services">My Listings</TabsTrigger>}
            {user.role === 'mentor' && <TabsTrigger value="availability">Availability</TabsTrigger>}
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tabs-trigger-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6 animate-in fade-in">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
               <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                   <Calendar className="h-4 w-4 text-muted-foreground" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{totalSessions}</div>
                   <p className="text-xs text-muted-foreground">{completedSessions} completed</p>
                 </CardContent>
               </Card>
               <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium">{user.role === 'mentor' ? 'Hours Mentored' : 'Hours Learned'}</CardTitle>
                   <Clock className="h-4 w-4 text-muted-foreground" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                   <p className="text-xs text-muted-foreground">Based on completed sessions</p>
                 </CardContent>
               </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Session Schedule</CardTitle>
                <CardDescription>All your mentorship meetings sorted by date.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No sessions scheduled yet.
                    </div>
                  ) : (
                    [...bookings]
                      .filter((session) => {
                        const startTime = new Date(session.scheduledAt).getTime();
                        const now = new Date().getTime();
                        const twoWeeksInMs = 14 * 24 * 60 * 60 * 1000;
                        
                        // Keep if it's upcoming, or if it's past but within 2 weeks
                        return startTime + (session.duration || 30) * 60000 > now - twoWeeksInMs;
                      })
                      .sort((a, b) => {
                        // Cancelled sessions always go to the bottom
                        if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
                        if (a.status !== 'cancelled' && b.status === 'cancelled') return -1;

                        const dateA = new Date(a.scheduledAt).getTime();
                        const dateB = new Date(b.scheduledAt).getTime();
                        const now = new Date().getTime();
                        
                        const isPastA = dateA + (a.duration || 30) * 60000 < now;
                        const isPastB = dateB + (b.duration || 30) * 60000 < now;

                        if (isPastA && !isPastB) return 1;
                        if (!isPastA && isPastB) return -1;
                        
                        return dateA - dateB;
                      })
                      .map((session) => {
                        const startTime = new Date(session.scheduledAt).getTime();
                        const durationMs = (session.duration || 30) * 60000;
                        const endTime = startTime + durationMs;
                        const now = new Date().getTime();
                        
                        let statusLabel = "Upcoming";
                        let statusColor = "bg-blue-500";
                        
                        if (session.status === 'cancelled') {
                          statusLabel = "Cancelled";
                          statusColor = "bg-destructive text-destructive-foreground";
                        } else if (now >= startTime && now <= endTime) {
                          statusLabel = "In Progress";
                          statusColor = "bg-green-500 animate-pulse";
                        } else if (now > endTime) {
                          statusLabel = "Passed";
                          statusColor = "bg-muted text-muted-foreground";
                        }

                        return (
                          <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={(user.role === 'mentor' ? session.menteeAvatar : session.mentorAvatar) || undefined} />
                                <AvatarFallback>
                                  <User className="w-5 h-5 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold truncate">
                                  {session.serviceTitle || 'Mentorship Session'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {user.role === 'mentor' ? `With ${session.menteeName}` : `With ${session.mentorName}`} • {new Date(session.scheduledAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`${statusColor} border-none shrink-0`}>
                                {statusLabel}
                              </Badge>
                              {session.status !== 'cancelled' && (
                                <div className="flex flex-wrap gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => setChatSession(session)}
                                    data-testid={`button-chat-${session.id}`}
                                  >
                                    <MessageCircle className="w-4 h-4" /> Chat
                                  </Button>
                                  <Dialog open={reschedulingSession?.id === session.id} onOpenChange={(open) => !open && setReschedulingSession(null)}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" onClick={() => setReschedulingSession(session)}>Reschedule</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                      <DialogHeader>
                                        <DialogTitle>Reschedule Session</DialogTitle>
                                        <CardDescription>Choose a new date and time for your session.</CardDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label>New Date</Label>
                                          <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>New Time</Label>
                                          <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} required />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setReschedulingSession(null)}>Cancel</Button>
                                        <Button onClick={handleReschedule} disabled={!rescheduleDate || !rescheduleTime}>Confirm Reschedule</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => handleCancelBooking(session.id)}
                                    data-testid={`button-cancel-${session.id}`}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      const isTime = now >= startTime - 5 * 60000 && now <= endTime + 5 * 60000;
                                      if (isTime) {
                                        setLocation(`/call/${session.id}`);
                                      } else {
                                        toast({
                                          title: "Not Time Yet",
                                          description: "You can only join the call 5 minutes before the scheduled time.",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    Join Call
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Your Listings</h2>
                  <p className="text-muted-foreground">Manage the services you offer to mentees.</p>
                </div>
                <Dialog open={isAddServiceOpen} onOpenChange={(open) => {
                  setIsAddServiceOpen(open);
                  if (!open) setEditingService(null);
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" onClick={() => setEditingService(null)}>
                      <Plus className="w-4 h-4" /> Create Listing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{editingService ? "Edit Listing" : "Add New Listing"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddService} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceTitle">Title</Label>
                        <Input id="serviceTitle" defaultValue={editingService?.title} placeholder="e.g., Resume Review" required />
                      </div>
                      <div className="space-y-2">
                         <Label htmlFor="serviceCategory">Category</Label>
                         <Input id="serviceCategory" defaultValue={editingService?.category} placeholder="e.g., Design, Engineering" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceDescription">Description</Label>
                        <Textarea id="serviceDescription" defaultValue={editingService?.description} placeholder="Describe what you will do..." required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="servicePrice">Price ($)</Label>
                          <Input id="servicePrice" type="number" min="0" defaultValue={editingService?.price} placeholder="50" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">{editingService ? "Update Listing" : "Create Listing"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
             </div>

             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myServices.length === 0 ? (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-muted rounded-xl">
                    <p className="text-muted-foreground mb-4">You haven't added any listings yet.</p>
                    <Button variant="outline" onClick={() => setIsAddServiceOpen(true)}>Create your first listing</Button>
                  </div>
                ) : (
                  myServices.map(service => (
                    <Card key={service.id} className="relative group">
                       <CardHeader>
                         <div className="flex justify-between items-start">
                            <Badge variant="secondary">{service.category}</Badge>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditingService(service);
                                  setIsAddServiceOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteService(service.id)}
                                data-testid={`button-delete-service-${service.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                         </div>
                         <CardTitle className="mt-2">{service.title}</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                       </CardContent>
                       <CardFooter className="flex justify-between items-center border-t pt-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" /> {service.duration} min
                          </div>
                          <span className="font-bold text-lg">${service.price}</span>
                       </CardFooter>
                    </Card>
                  ))
                )}
             </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Your Availability</h2>
                  <p className="text-muted-foreground">Set times when you're available for mentorship sessions.</p>
                </div>
                <Dialog open={isAddAvailabilityOpen} onOpenChange={setIsAddAvailabilityOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-availability">
                      <Plus className="w-4 h-4" /> Add Time Slot
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Add Available Time</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAvailability} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dayOfWeek">Day of Week</Label>
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day, index) => {
                              // Monday is 1, Sunday is 0 in Date-fns
                              const value = day === "Sunday" ? "0" : String(index + 1);
                              return <SelectItem key={index} value={value}>{day}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startTime">Start Time</Label>
                          <Input id="startTime" name="startTime" type="time" defaultValue="09:00" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime">End Time</Label>
                          <Input id="endTime" name="endTime" type="time" defaultValue="17:00" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Time Slot</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
             </div>

             <Card>
               <CardHeader>
                 <CardTitle>Weekly Schedule</CardTitle>
                 <CardDescription>Your available hours for each day of the week.</CardDescription>
               </CardHeader>
               <CardContent>
                 {myAvailability.length === 0 ? (
                   <div className="py-12 text-center border-2 border-dashed border-muted rounded-xl">
                     <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                     <p className="text-muted-foreground mb-4">You haven't set your availability yet.</p>
                     <Button variant="outline" onClick={() => setIsAddAvailabilityOpen(true)}>Add your first time slot</Button>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {DAYS_OF_WEEK.map((day, index) => {
                       const dayIndex = day === "Sunday" ? 0 : index + 1;
                       const daySlots = myAvailability.filter((slot: Availability) => slot.dayOfWeek === dayIndex);
                       return (
                         <div key={dayIndex} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                           <div className="flex items-center gap-4">
                             <span className="font-medium w-24">{day}</span>
                             <div className="flex flex-wrap gap-2">
                               {daySlots.length === 0 ? (
                                 <span className="text-sm text-muted-foreground">Not available</span>
                               ) : (
                                 daySlots.map((slot: Availability) => (
                                   <Badge key={slot.id} variant="secondary" className="flex items-center gap-2">
                                     {slot.startTime} - {slot.endTime}
                                     <button 
                                       onClick={() => handleDeleteAvailability(slot.id)}
                                       className="hover:text-destructive ml-1"
                                       data-testid={`button-delete-availability-${slot.id}`}
                                     >
                                       <Trash2 className="w-3 h-3" />
                                     </button>
                                   </Badge>
                                 ))
                               )}
                             </div>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => {
                               const dayIndex = day === "Sunday" ? 0 : index + 1;
                               setSelectedDay(String(dayIndex));
                               setIsAddAvailabilityOpen(true);
                             }}
                           >
                             <Plus className="w-4 h-4" />
                           </Button>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="min-h-[300px] flex items-center justify-center text-muted-foreground">
               <div className="text-center p-8">
                 <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                 <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
                 <p className="mb-4">Add a payment method to book sessions.</p>
                 <Button>Add Card</Button>
               </div>
            </Card>
          </TabsContent>
          
           <TabsContent value="settings">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how MentorMatch looks on your device.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Theme</Label>
                        <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                        <Button 
                          variant={!document.documentElement.classList.contains('dark') ? 'secondary' : 'ghost'} 
                          size="sm" 
                          onClick={() => {
                            document.documentElement.classList.remove('dark');
                            localStorage.setItem('theme', 'light');
                            window.location.reload();
                          }}
                        >
                          Light
                        </Button>
                        <Button 
                          variant={document.documentElement.classList.contains('dark') ? 'secondary' : 'ghost'} 
                          size="sm"
                          onClick={() => {
                            document.documentElement.classList.add('dark');
                            localStorage.setItem('theme', 'dark');
                            window.location.reload();
                          }}
                        >
                          Dark
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details and public profile.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleProfileUpdate}>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First name</Label>
                          <Input id="firstName" name="firstName" defaultValue={user.firstName} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input id="lastName" name="lastName" defaultValue={user.lastName} />
                        </div>
                      </div>
                      
                      {user.role === 'mentor' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Job Title</Label>
                            <Input id="title" name="title" defaultValue={user.title || ""} placeholder="e.g. Senior Product Designer" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input id="company" name="company" defaultValue={user.company || ""} placeholder="e.g. Acme Inc" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="avatar-upload">Profile Picture</Label>
                        <div className="flex gap-4 items-center">
                           <Avatar className="h-16 w-16 border shrink-0">
                             <AvatarImage src={user.avatar || undefined} />
                             <AvatarFallback>
                               <User className="w-8 h-8 text-muted-foreground" />
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col gap-2 flex-1">
                             <Input 
                               id="avatar-upload" 
                               type="file" 
                               accept="image/*"
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   const reader = new FileReader();
                                   reader.onloadend = () => {
                                     const base64String = reader.result as string;
                                     // Create a hidden input to store the base64 value for the form submission
                                     let hiddenInput = document.getElementById('avatar-base64') as HTMLInputElement;
                                     if (!hiddenInput) {
                                       hiddenInput = document.createElement('input');
                                       hiddenInput.type = 'hidden';
                                       hiddenInput.id = 'avatar-base64';
                                       hiddenInput.name = 'avatar';
                                       e.target.parentElement?.appendChild(hiddenInput);
                                     }
                                     hiddenInput.value = base64String;
                                   };
                                   reader.readAsDataURL(file);
                                 }
                               }}
                             />
                             <p className="text-xs text-muted-foreground">Upload a JPG, PNG or WebP image.</p>
                           </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" defaultValue={user.email} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea 
                          id="bio" 
                          name="bio"
                          className="min-h-[120px]"
                          placeholder="Tell us a little about yourself"
                          defaultValue={user.bio || ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interests">Interests (comma separated)</Label>
                        <Input 
                          id="interests" 
                          name="interests" 
                          defaultValue={user.interests?.join(', ') || ""} 
                          placeholder="e.g. Design, Coding, Business" 
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                      <Button type="submit">Save Changes</Button>
                    </CardFooter>
                  </form>
                </Card>

                 <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Manage how we communicate with you.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="marketing" className="flex flex-col space-y-1">
                        <span>Marketing emails</span>
                        <span className="font-normal text-xs text-muted-foreground">Receive emails about new features and promotions.</span>
                      </Label>
                      <Switch id="marketing" />
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="security" className="flex flex-col space-y-1">
                        <span>Security alerts</span>
                        <span className="font-normal text-xs text-muted-foreground">Receive emails about your account security.</span>
                      </Label>
                      <Switch id="security" defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Actions that cannot be undone.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" data-testid="button-delete-account">Delete Account</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <CardDescription>
                              This action cannot be undone. This will permanently delete your account
                              and remove your data from our servers.
                            </CardDescription>
                          </DialogHeader>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <DialogTrigger asChild>
                              <Button variant="ghost">Cancel</Button>
                            </DialogTrigger>
                            <Button 
                              variant="destructive" 
                              onClick={async () => {
                                try {
                                  await deleteUserMutation.mutateAsync(user.id);
                                  toast({
                                    title: "Account deleted",
                                    description: "Your account has been successfully removed."
                                  });
                                  logout();
                                  setLocation("/auth");
                                } catch (error) {
                                  toast({
                                    title: "Deletion failed",
                                    description: "Failed to delete account. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              Confirm Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!chatSession} onOpenChange={(open) => !open && setChatSession(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(user.role === 'mentor' ? chatSession?.menteeAvatar : chatSession?.mentorAvatar) || undefined} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                Chat with {user.role === 'mentor' ? chatSession?.menteeName : chatSession?.mentorName}
              </DialogTitle>
              <CardDescription>
                {chatSession?.serviceTitle || 'Mentorship Session'} • {chatSession && new Date(chatSession.scheduledAt).toLocaleDateString()}
              </CardDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/20">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                          msg.senderId === user.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Type your message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                data-testid="input-chat-message"
              />
              <Button onClick={handleSendMessage} disabled={!chatMessage.trim()} data-testid="button-send-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
