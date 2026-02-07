# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

基估宝 (Real-time Fund Valuation) is a pure front-end fund valuation and tracking tool built with Next.js 16 (App Router). It fetches real-time fund data from public Chinese financial APIs using JSONP/Script Tag Injection to bypass CORS restrictions, enabling static deployment on GitHub Pages without a backend server.

## Development Commands

```bash
# Install dependencies (use --legacy-peer-deps flag)
npm install --legacy-peer-deps

# Local development (runs on http://localhost:3000)
npm run dev

# Production build (outputs to ./out directory for static deployment)
npm run build

# Production server (for Docker/containerized deployment)
npm start

# Docker build and run
docker build -t real-time-fund .
docker run -d -p 3000:3000 --name fund real-time-fund

# Docker Compose
docker compose up -d
```

## Node Version Requirement

Node.js >= 20.9.0 (see package.json engines field). Docker uses Node 22.

## Architecture

### Core Application Structure

- **Single Page App**: `app/page.jsx` (~4400 lines) - Contains all application logic, state management, and UI components
- **Layout**: `app/layout.jsx` - Root layout with Google Analytics integration
- **Styles**: `app/globals.css` - Glassmorphism design system with CSS custom properties
- **Components**: `app/components/` - Reusable UI components (AnalyticsGate, Announcement)
- **Supabase Client**: `app/lib/supabase.js` - Authentication and cloud sync configuration

### Data Fetching Strategy (JSONP)

The application uses three different CORS-bypassing techniques:

1. **Fund Valuation Data** (天天基金/eastmoney): Script tag injection with global callback interception
   - Dynamically creates `<script>` tags pointing to `fundgz.1234567.com.cn/js/{code}.js`
   - Temporarily overrides `window.jsonpgz` to capture response, then restores original
   - Uses unique callback names to avoid race conditions: `jsonpgz_{code}_{random}`

2. **Fund Search** (东方财富): JSONP with dynamic callback
   - URL: `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashjx`
   - Dynamically creates global callback functions: `SuggestData_{timestamp}`

3. **Stock Quotes** (腾讯财经): Similar script injection approach

### State Management

The app uses React hooks for state management with localStorage persistence:
- `funds`: Array of fund objects with valuation data
- `holdings`: User's fund holdings with amounts and cost basis
- `viewMode`: Table/Card view toggle
- `favorites`: User's favorite funds
- `user`: Authenticated user session (Supabase)
- `refreshMs`: Auto-refresh interval (5-300 seconds)

### Supabase Integration

**Authentication**: Email-based OTP (one-time password) flow
- `signInWithOtp()` - Sends OTP to user's email
- `verifyOtp()` - Verifies the OTP token

**Cloud Sync**: Real-time sync of user configuration (funds, holdings, favorites) across devices
- Listens to PostgreSQL changes on `user_configs` table
- Bi-directional sync: local changes push to Supabase, remote changes pull to local
- Row Level Security (RLS) is configured on Supabase backend

Key functions:
- `syncToCloud()` - Pushes local state to Supabase
- `loadFromCloud()` - Fetches remote configuration
- Subscription on `postgres_changes` event for real-time updates

### Design System

**Glassmorphism UI** defined in `app/globals.css`:
- CSS Custom Properties for theming (colors, spacing)
- `.glass` class: Semi-transparent backgrounds with backdrop-filter blur
- Responsive design: Mobile-first with desktop enhancements
- Two view modes: Card view (default) and Table view (PC optimized)

**Animation**: Framer Motion for smooth transitions
- `AnimatePresence` for entry/exit animations
- `Reorder` for drag-and-drop fund reordering
- Spring animations for interactions

### Static Export Configuration

The app is configured for static export (`next.config.js`):
- `reactStrictMode: true`
- No API routes (pure client-side)
- Build outputs to `./out` directory for GitHub Pages deployment

## Key Patterns & Conventions

1. **Inline Components**: Icon components (PlusIcon, TrashIcon, etc.) are defined inline in page.jsx
2. **LocalStorage Keys**: Prefixed with descriptive names (e.g., `hasClosedAnnouncement_v5`)
3. **Debouncing**: Search input uses debounce to avoid excessive API calls
4. **Error Handling**: Fallback logic when fund valuation data is unavailable (uses latest NAV data instead)
5. **Mobile Interactions**: Swipe-to-delete on mobile, click-to-delete on desktop

## Deployment

**GitHub Pages**: Automatic deployment on push to `main` branch via `.github/workflows/nextjs.yml`
- Uses `actions/upload-pages-artifact@v3` to deploy `./out` directory
- Node 20 in CI environment

**Docker**: Multi-stage build (builder + runner stages)
- Exposes port 3000
- Healthcheck included for container monitoring

## Environment Notes

- **No build-time environment variables** needed for core functionality
- Supabase credentials are hardcoded in `app/lib/supabase.js` (anon key is safe for client-side)
- Google Analytics only loads on `hzm0321.github.io` domain (see AnalyticsGate component)
