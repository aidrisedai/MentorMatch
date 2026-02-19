import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-3xl font-heading font-bold">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-primary">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using MentorMatch, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-primary">2. Use of Service</h2>
              <p className="text-muted-foreground">
                MentorMatch provides a platform connecting mentors and mentees. Users must be at least 13 years of age. You are responsible for maintaining the security of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary">3. Mentorship Sessions</h2>
              <p className="text-muted-foreground">
                Payments for mentorship sessions are handled through our platform. Cancellations and rescheduling are subject to the mentor's individual policies and our platform guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary">4. Code of Conduct</h2>
              <p className="text-muted-foreground">
                Users must interact respectfully. Harassment, discrimination, or abusive behavior will result in immediate account termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary">5. Disclaimer</h2>
              <p className="text-muted-foreground">
                MentorMatch is not responsible for the advice or guidance provided by mentors. Use of information provided during sessions is at your own risk.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
