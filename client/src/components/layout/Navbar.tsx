import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User, Settings, Sparkles, Globe } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/authStore";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { t, i18n } = useTranslation();
  
  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const langCode = i18n.language.split('-')[0];
  const currentLang = languages.find(l => l.code === langCode) || languages[0];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight cursor-pointer" data-testid="link-home">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground">
              M
            </div>
            <span className="gradient-text">MentorMatch</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/marketplace">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/marketplace' ? 'text-primary glow-text' : 'text-muted-foreground'}`} data-testid="link-marketplace">
              {t('nav.mentors')}
            </div>
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard">
              <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary glow-text' : 'text-muted-foreground'}`} data-testid="link-dashboard">
                {t('nav.dashboard')}
              </div>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-language">
                <Globe className="w-4 h-4" />
                <span className="text-sm">{currentLang.flag}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              {languages.map(lang => (
                <DropdownMenuItem 
                  key={lang.code} 
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={langCode === lang.code ? 'bg-primary/10' : ''}
                  data-testid={`lang-${lang.code}`}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-4 w-px bg-border/50" />
          
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9 neon-border">
                    <AvatarImage src={user.avatar || undefined} alt={user.firstName} />
                    <AvatarFallback className="gradient-bg text-primary-foreground">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('nav.profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard?tab=settings")} data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('nav.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive" data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('nav.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth?tab=login">
                <div className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-login">
                  {t('nav.signIn')}
                </div>
              </Link>
              <Link href="/auth?tab=signup">
                <Button size="sm" className="font-semibold gradient-bg glow" data-testid="button-get-started">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t('nav.getStarted')}
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
           <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass border-border/40">
              <div className="flex flex-col gap-4 mt-8">
                {isAuthenticated && user && (
                  <div className="flex items-center gap-3 mb-4 px-2">
                    <Avatar className="neon-border">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="gradient-bg text-primary-foreground">
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                )}
                
                <Link href="/">
                  <div className="text-lg font-medium font-heading cursor-pointer">{t('nav.home')}</div>
                </Link>
                <Link href="/marketplace">
                  <div className="text-lg font-medium font-heading cursor-pointer">{t('nav.mentors')}</div>
                </Link>
                {isAuthenticated && (
                  <Link href="/dashboard">
                    <div className="text-lg font-medium font-heading cursor-pointer">{t('nav.dashboard')}</div>
                  </Link>
                )}
                
                <div className="h-px bg-border/50 my-2" />
                
                {isAuthenticated ? (
                  <Button variant="destructive" onClick={handleLogout} className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('nav.signOut')}
                  </Button>
                ) : (
                  <Link href="/auth?tab=signup">
                    <Button className="w-full gradient-bg glow">
                      <Sparkles className="w-3 h-3 mr-2" />
                      {t('nav.getStarted')}
                    </Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
