# Hotel Management System (PMS)

## Overview

This is a comprehensive Property Management System (PMS) designed for modern hotels with multi-branch support and role-based access control. The system provides a full-stack solution for managing reservations, rooms, guests, billing, and analytics across multiple hotel branches.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Real-time Updates**: WebSocket connection for live data synchronization

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth integration with custom user management
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket server for live updates

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Migrations**: Managed through `drizzle-kit` with migrations stored in `./migrations`

## Key Components

### Core Entities
1. **Users**: Multi-role support (superadmin, branch-admin, front-desk)
2. **Branches**: Multi-branch hotel management
3. **Rooms**: Room inventory with types and status tracking
4. **Guests**: Guest information and history management
5. **Reservations**: Multi-room booking system with flexible check-in/out dates
6. **Billing**: Invoice generation and payment tracking

### Feature Modules
- **Dashboard**: Real-time metrics and quick actions
- **Analytics**: Revenue, occupancy, and operational reporting
- **Notifications**: Push notification system with service worker
- **Settings**: Hotel configuration and preferences

## Data Flow

### Authentication Flow
1. Replit Auth handles initial authentication
2. Custom user management system with role-based permissions
3. Session storage in PostgreSQL for persistent login state
4. Branch-level access control based on user roles

### Reservation Management
1. Multi-room reservation creation with different check-in/out dates per room
2. Real-time room availability checking
3. Guest information capture and management
4. Status tracking throughout the reservation lifecycle

### Real-time Updates
1. WebSocket connections for live data synchronization
2. Automatic data refresh using TanStack Query
3. Broadcast system for cross-user updates
4. Mobile-optimized real-time sync with fallback to polling

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (configured via DATABASE_URL)
- **Authentication**: Replit Auth system
- **Push Notifications**: Web Push API with VAPID keys
- **Process Management**: PM2 for production deployment

### Key Libraries
- **Frontend**: React, TanStack Query, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Express, Drizzle ORM, web-push, ws (WebSocket)
- **Development**: Vite, TypeScript, tsx for development server

## Deployment Strategy

### Development
- Vite dev server for frontend hot reload
- tsx for TypeScript execution in development
- Integrated Replit development environment

### Production
- Vite build for optimized frontend bundle
- esbuild for server-side bundling
- PM2 ecosystem configuration for process management
- Static file serving through Express

### Database Management
- Schema definitions in shared TypeScript files
- Migration management through drizzle-kit
- Environment-based configuration

## Changelog
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.