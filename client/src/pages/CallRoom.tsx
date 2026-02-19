import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/authStore";
import Navbar from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CallRoom() {
  const { bookingId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLocation("/auth");
      return;
    }

    const fetchMeetingLink = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch booking details");
        }
        
        const booking = await response.json();
        
        if (booking.meetingLink) {
          setMeetingLink(booking.meetingLink);
          // Auto-redirect to Google Meet after 3 seconds
          setTimeout(() => {
            window.open(booking.meetingLink, '_blank');
          }, 3000);
        } else {
          setError("No Google Meet link available for this session. The mentor may need to connect their Google account.");
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load meeting details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingLink();
  }, [bookingId, isAuthenticated, user, setLocation]);

  const handleJoinMeeting = () => {
    if (meetingLink) {
      window.open(meetingLink, '_blank');
    }
  };

  const handleReturnToDashboard = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8">
        <Card className="max-w-md w-full p-8">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Loading meeting details...</h2>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Unable to Join Meeting</h2>
              <p className="text-center text-muted-foreground">{error}</p>
              <Button onClick={handleReturnToDashboard} className="mt-4">
                Return to Dashboard
              </Button>
            </div>
          ) : meetingLink ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="#34A853"
                  />
                </svg>
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Your Google Meet is Ready</h2>
                <p className="text-muted-foreground">
                  Click the button below to join your mentorship session on Google Meet
                </p>
              </div>

              <div className="w-full space-y-3">
                <Button 
                  onClick={handleJoinMeeting}
                  className="w-full gap-2"
                  size="lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Join Google Meet
                </Button>
                
                <Button 
                  onClick={handleReturnToDashboard}
                  variant="outline"
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center mt-4">
                <p>You'll be redirected to Google Meet automatically in a few seconds...</p>
                <p className="mt-2">Make sure pop-ups are enabled for this site.</p>
              </div>
            </div>
          ) : null}
        </Card>
      </main>
    </div>
  );
}