import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-3xl font-heading font-bold">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-primary">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, including your name, email address, profile information, and communication history within the platform.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-primary">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use your information to provide, maintain, and improve our services, process transactions, and communicate with you about your sessions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                Mentors and mentees share specific profile information when booking sessions. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement reasonable security measures to protect your personal information from unauthorized access or disclosure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary">5. Your Rights</h2>
              <p className="text-muted-foreground">
                You may update or delete your account information at any time through your dashboard settings.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
