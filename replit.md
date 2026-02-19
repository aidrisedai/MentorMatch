# MentorMatch

## Overview

MentorMatch is a mentorship platform designed for middle and high school students to connect with real-world professionals for 1-on-1 guidance. The platform enables students (mentees) to discover mentors, browse their services, and book mentorship sessions across various career fields like tech, design, and business.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: 
  - Zustand with persist middleware for auth state (`authStore.ts`)
  - TanStack React Query for server state and API caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming (dark mode by default with cyan/magenta color scheme)
- **Internationalization**: react-i18next with browser language detection
  - Supported languages: English, Spanish, Chinese, French
  - Translation files in `client/src/i18n/locales/`
  - Language switcher in navbar with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful JSON API with routes prefixed by `/api`
- **Authentication**: Custom session-based auth with bcrypt password hashing (no session middleware currently configured - stateless JWT-style approach via client-side storage)
- **Email Verification**: Required before login; 24-hour token expiration; Resend for email delivery
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Video Calls**: Custom WebRTC peer-to-peer with WebSocket signaling server (`server/signaling.ts`, path `/ws/signaling`)
- **Recommendations**: Interest-based mentor matching; user interests collected during onboarding (`/onboarding` page)

### Data Storage
- **Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Core Tables**:
  - `users` - Stores both mentors and mentees with role differentiation
  - `services` - Mentorship services offered by mentors (price, duration, category)
  - `bookings` - Session bookings between mentors and mentees
  - `expertise` - Skills/expertise tags for users
- **User Fields**: `interests` (text array), `onboardingCompleted` (boolean) for recommendation system

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), server (`server/`), and shared code (`shared/`) in one repository
- **Storage Interface Pattern**: `IStorage` interface in `storage.ts` abstracts database operations for testability
- **Schema Validation**: Zod schemas generated from Drizzle schemas using `drizzle-zod` for runtime validation
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared directory

### Build & Development
- **Development**: Vite dev server for frontend, tsx for backend with hot reload
- **Production Build**: esbuild bundles server code, Vite builds client assets
- **Database Migrations**: Drizzle Kit with `db:push` command
- **Database Seeding**: Run `npx tsx server/seed.ts` to populate sample mentor data (5 mentors with expertise and 6 services)

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session store (available but not currently in use)

### Third-Party Services (Available in Dependencies)
- **Stripe**: Payment processing (library installed, not yet integrated)
- **OpenAI / Google Generative AI**: AI capabilities (libraries installed)
- **Nodemailer**: Email sending (library installed)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **React Day Picker**: Calendar component
- **Embla Carousel**: Carousel functionality
- **Vaul**: Drawer component

### Development Tools
- **Replit Plugins**: Dev banner, cartographer, runtime error overlay for Replit environment