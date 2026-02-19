import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
// import authBackground from "@assets/generated_images/abstract_connection_network_background.png";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/authStore";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function AuthPage() {
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") === "signup" ? "signup" : "login";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'mentor' | 'mentee'>('mentee');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "signup" || tab === "login") {
      setActiveTab(tab);
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const user = await response.json();
        setUser(user);
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        
        // Redirect based on role and onboarding status
        if (user.role === "mentee" && !user.onboardingCompleted) {
          setLocation("/onboarding");
        } else {
          setLocation("/dashboard");
        }
      } else {
        const error = await response.json();
        if (error.requiresVerification) {
          setVerificationEmail(error.email);
          setShowVerificationMessage(true);
        } else {
          toast({
            title: "Login Failed",
            description: error.message || "Invalid email or password. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail })
      });
      
      const data = await response.json();
      toast({
        title: "Verification Email Sent",
        description: data.message || "Please check your inbox.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const firstName = (document.getElementById('first-name') as HTMLInputElement).value;
    const lastName = (document.getElementById('last-name') as HTMLInputElement).value;
    const email = (document.getElementById('signup-email') as HTMLInputElement).value;
    const password = (document.getElementById('signup-password') as HTMLInputElement).value;
    const isMentor = (document.getElementById('role-mentor') as HTMLInputElement).checked;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role: isMentor ? "mentor" : "mentee",
          avatar: null
        })
      });

      if (response.ok) {
        const user = await response.json();
        setUser(user);
        toast({
          title: "Account Created!",
          description: "Your account has been successfully created.",
        });
        
        // Redirect based on role
        if (user.role === "mentee") {
          setLocation("/onboarding");
        } else {
          setLocation("/dashboard");
        }
      } else {
        const error = await response.json();
        toast({
          title: "Signup Failed",
          description: error.message || "Unable to create account. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Signup Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      <div className="flex items-center justify-center p-8 bg-transparent relative z-10">
        <Link href="/">
          <a data-testid="link-home" className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
        </Link>
        
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-left-8 fade-in duration-500">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">M</div>
            <h1 className="font-heading font-bold text-3xl">Welcome to MentorMatch! 🎓</h1>
            <p className="text-muted-foreground mt-2">Join thousands of students crushing their goals together.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" data-testid="tab-login">Log In</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <Card className="border-none shadow-none">
                  <CardContent className="space-y-4 p-0">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" data-testid="input-email" type="email" placeholder="name@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                      </div>
                      <Input id="password" data-testid="input-password" type="password" required />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm font-normal">Remember me for 30 days</Label>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 pt-6">
                    <Button type="submit" data-testid="button-login" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Log In"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <GoogleSignIn role="mentee" />
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <Card className="border-none shadow-none">
                  <CardContent className="space-y-4 p-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First name</Label>
                        <Input id="first-name" data-testid="input-firstname" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last name</Label>
                        <Input id="last-name" data-testid="input-lastname" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" data-testid="input-signup-email" type="email" placeholder="name@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" data-testid="input-signup-password" type="password" required />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Must be at least 8 characters and include 3 of: lowercase, uppercase, numbers, symbols.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>I want to join as a:</Label>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="relative">
                          <input type="radio" name="role" id="role-mentee" data-testid="radio-mentee" className="peer sr-only" defaultChecked onChange={() => setSelectedRole('mentee')} />
                          <label htmlFor="role-mentee" className="flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                            <span className="font-semibold text-sm">Student 📚</span>
                            <span className="text-xs text-muted-foreground">I want a mentor</span>
                          </label>
                        </div>
                        <div className="relative">
                          <input type="radio" name="role" id="role-mentor" data-testid="radio-mentor" className="peer sr-only" onChange={() => setSelectedRole('mentor')} />
                          <label htmlFor="role-mentor" className="flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                            <span className="font-semibold text-sm">Mentor ⭐</span>
                            <span className="text-xs text-muted-foreground">I want to guide</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 pt-6">
                    <Button type="submit" data-testid="button-signup" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <GoogleSignIn role={selectedRole} text="Sign up with Google" />
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our <Link href="/terms"><div className="inline underline hover:text-foreground cursor-pointer">Terms of Service</div></Link> and <Link href="/privacy"><div className="inline underline hover:text-foreground cursor-pointer">Privacy Policy</div></Link>.
          </p>
        </div>
      </div>

      <div className="hidden lg:block relative bg-transparent overflow-hidden z-10">
        {/* Background image placeholder - add your background image here */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        
        <div className="absolute bottom-12 left-12 right-12 text-foreground space-y-4">
          <blockquote className="text-2xl font-medium font-heading leading-relaxed text-muted-foreground">
            "My mentor helped me realize I wanted to study computer science. It was so helpful to talk to someone who's actually doing it!"
          </blockquote>
          <div>
            <div className="font-bold text-lg text-foreground">Emma K.</div>
            <div className="text-muted-foreground">High School Junior</div>
          </div>
        </div>
      </div>
    </div>
  );
}
