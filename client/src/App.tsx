import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Marketplace from "@/pages/Marketplace";
import MentorProfile from "@/pages/MentorProfile";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/AuthPage";
import CallRoom from "@/pages/CallRoom";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import VerifyEmail from "@/pages/VerifyEmail";
import Onboarding from "@/pages/Onboarding";
import GoogleAuthCallback from "@/pages/GoogleAuthCallback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/mentor/:id" component={MentorProfile} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/google/success" component={GoogleAuthCallback} />
      <Route path="/auth/google/error" component={GoogleAuthCallback} />
      <Route path="/call/:bookingId" component={CallRoom} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
