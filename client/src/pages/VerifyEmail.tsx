import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
// import authBackground from "@assets/generated_images/abstract_connection_network_background.png";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already_verified">("loading");
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    verifyEmail(token);
  }, []);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
      } else if (response.status === 400 && data.message?.includes("already verified")) {
        setStatus("already_verified");
        setMessage("Your email is already verified.");
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        // backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, transparent 50%, hsl(var(--primary) / 0.05) 100%)'
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <Card className="relative z-10 w-full max-w-md bg-card/95 backdrop-blur border-border/50" data-testid="verify-email-card">
        <CardContent className="pt-8 pb-8 text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
              <h1 className="text-2xl font-bold">Verifying your email...</h1>
              <p className="text-muted-foreground">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <h1 className="text-2xl font-bold text-green-500">Email Verified!</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button 
                onClick={() => setLocation("/auth")} 
                className="mt-4"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === "already_verified" && (
            <div className="space-y-4">
              <Mail className="h-16 w-16 mx-auto text-primary" />
              <h1 className="text-2xl font-bold">Already Verified</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button 
                onClick={() => setLocation("/auth")} 
                className="mt-4"
                data-testid="button-go-to-login-already"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <h1 className="text-2xl font-bold text-destructive">Verification Failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  onClick={() => setLocation("/auth?tab=signup")} 
                  variant="outline"
                  data-testid="button-try-again"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => setLocation("/auth")} 
                  data-testid="button-go-to-login-error"
                >
                  Go to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
