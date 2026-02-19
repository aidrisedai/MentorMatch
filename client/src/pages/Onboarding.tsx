import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/authStore";
import { useUpdateUser } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const INTEREST_OPTIONS = [
  "Coding", "Tech Careers", "Design", "Business", "Data Science", 
  "Entrepreneurship", "Branding", "App Design", "Machine Learning",
  "Mathematics", "Physics", "Biology", "Chemistry", "Engineering", "Robotics"
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const updateUser = useUpdateUser();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    try {
      const updatedUser = await updateUser.mutateAsync({
        id: user.id,
        updates: {
          interests: selectedInterests,
          onboardingCompleted: true
        }
      });
      
      setUser(updatedUser);
      toast({
        title: "Welcome!",
        description: "Your preferences have been saved. We've updated your recommendations.",
      });
      setLocation("/marketplace");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading text-primary">Personalize Your Experience</CardTitle>
          <CardDescription className="text-lg">
            Tell us what you're interested in so we can recommend the best mentors for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {INTEREST_OPTIONS.map((interest) => (
              <div 
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`
                  flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                  ${selectedInterests.includes(interest) 
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.2)]" 
                    : "border-border bg-muted/30 hover:border-primary/50"}
                `}
              >
                <Checkbox 
                  id={interest} 
                  checked={selectedInterests.includes(interest)}
                  onCheckedChange={() => toggleInterest(interest)}
                />
                <Label 
                  htmlFor={interest}
                  className="font-medium cursor-pointer flex-1"
                >
                  {interest}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-8">
          <Button 
            className="w-full h-12 text-lg font-bold" 
            size="lg"
            onClick={handleSubmit}
            disabled={selectedInterests.length === 0 || updateUser.isPending}
          >
            {updateUser.isPending ? "Saving..." : "Start Exploring Mentors"}
          </Button>
          <p className="text-xs text-center text-muted-foreground italic">
            You can always update these preferences later in your profile.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
