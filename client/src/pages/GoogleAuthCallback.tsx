import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/authStore";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function GoogleAuthCallback() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      // Get token from URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const error = window.location.pathname.includes("/error");

      if (error) {
        toast({
          title: "Authentication Failed",
          description: "Failed to sign in with Google. Please try again.",
          variant: "destructive",
        });
        setLocation("/auth");
        return;
      }

      if (token) {
        try {
          // Exchange token for user data
          const response = await fetch("/api/auth/google/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            throw new Error("Failed to verify token");
          }

          const user = await response.json();
          login(user);
          
          toast({
            title: "Success",
            description: "Successfully signed in with Google!",
          });

          // Redirect based on user role and onboarding status
          if (!user.onboardingCompleted) {
            setLocation("/onboarding");
          } else {
            setLocation("/dashboard");
          }
        } catch (error) {
          console.error("Failed to handle Google auth callback:", error);
          toast({
            title: "Error",
            description: "Failed to complete sign in. Please try again.",
            variant: "destructive",
          });
          setLocation("/auth");
        }
      } else {
        // No token in URL
        setLocation("/auth");
      }
    };

    handleCallback();
  }, [login, setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Completing sign in...</h2>
          <p className="text-muted-foreground text-center">
            Please wait while we complete your Google sign in.
          </p>
        </div>
      </Card>
    </div>
  );
}