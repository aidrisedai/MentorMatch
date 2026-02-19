import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import Navbar from "@/components/layout/Navbar";
import heroImage from "@assets/generated_images/professional_mentor_guiding_student..png";
import { Search, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const { t } = useTranslation();
  return (
    <div className="h-screen bg-background font-sans overflow-hidden flex flex-col grid-pattern">
      <Navbar />
      
      <main className="flex-1 flex items-center relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-[100px] animate-float" style={{animationDelay: '-3s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-700 fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Built for Middle & High Schoolers
              </div>
              
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                {t('landing.hero.title')}
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                {t('landing.hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Try 'Coding' or 'Design'" 
                    className="pl-9 h-12 text-sm bg-card/70 border-border/50 focus:border-primary shadow-sm backdrop-blur-md text-foreground placeholder:text-muted-foreground/80" 
                    data-testid="input-search"
                  />
                </div>
                <Link href="/marketplace">
                  <Button size="lg" className="h-12 px-8 text-sm gradient-bg glow hover:opacity-90 transition-all group" data-testid="button-find-mentor">
                    {t('landing.hero.cta')}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6">
                {[
                  { icon: Zap, label: "Real Advice", desc: "From pros" },
                  { icon: Shield, label: "Safe & Verified", desc: "Trusted" },
                  { icon: Sparkles, label: "Flexible", desc: "Your schedule" }
                ].map((item, i) => (
                  <div key={i} className="glass rounded-xl p-3 text-center animate-float" style={{animationDelay: `${i * 0.5}s`}}>
                    <div className="w-10 h-10 rounded-lg gradient-bg mx-auto mb-2 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative animate-in slide-in-from-right-4 duration-1000 fade-in delay-200 lg:block">
              <div className="absolute inset-0 gradient-bg rounded-[2rem] blur-3xl transform rotate-3 scale-95 opacity-30 animate-pulse-glow"></div>
              <div className="relative rounded-[2rem] overflow-hidden neon-border aspect-[4/3]">
                <img 
                  src="/images/hero-mentor.png" 
                  alt="Mentorship Session" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="font-heading font-medium text-lg leading-snug">"My mentor helped me discover my passion for engineering and guided me through my first project!"</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="gradient-bg border-none text-[10px] uppercase tracking-wider">High School Junior</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 border-t border-border/40 glass">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <div className="w-7 h-7 rounded gradient-bg flex items-center justify-center text-primary-foreground text-xs font-bold">M</div>
            <span className="gradient-text">MentorMatch</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms"><div className="text-[10px] text-muted-foreground hover:text-primary cursor-pointer">Terms</div></Link>
            <Link href="/privacy"><div className="text-[10px] text-muted-foreground hover:text-primary cursor-pointer">Privacy</div></Link>
            <p className="text-[10px] text-muted-foreground">© 2024 MentorMatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
