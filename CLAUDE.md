# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow ⚠️ MANDATORY

**All code changes must follow this strict workflow:**

1. **Code Review**: After completing any code changes, perform a thorough self-review using the code-review agent
2. **Commit**: Create a git commit with descriptive message after review passes
3. **Test**: Run tests and verify functionality in Docker environment
4. **Fix Issues**: Address any review feedback or test failures
5. **Push**: Only push to remote after all reviews pass and tests succeed

**Docker-Only Development**:
- All local development MUST use Docker (not native Node.js)
- All testing MUST be done in Docker container
- Build verification MUST use Docker build

```bash
# Standard development cycle
docker compose up -d --build               # Build and start
# Manual testing in browser at http://localhost:3000
docker compose logs -f                     # Check logs if needed
docker compose down                        # Stop when done
git add . && git commit -m "feat: ..."     # Commit after successful test
git push                                   # Push only after all checks pass
```

**Important**: After code changes, always rebuild with `docker compose up -d --build` to ensure the latest code is running.

## Project Overview

基估宝 (Real-time Fund Valuation) is a pure front-end fund valuation and tracking tool built with Next.js 16 (App Router). It fetches real-time fund data from public Chinese financial APIs using JSONP/Script Tag Injection to bypass CORS restrictions, enabling static deployment on GitHub Pages without a backend server.

**Key Features**:
- Real-time fund valuation with estimated pricing
- Historical net value trends with interactive charts
- Top 10 holdings tracking
- Cloud sync via Supabase
- Import/export configuration for backup

## Development Commands

```bash
# Docker Compose (recommended)
docker compose up -d --build             # Build and start with health check
docker compose logs -f                   # View logs
docker compose ps                        # Check status
docker compose restart                   # Restart container
docker compose down                      # Stop and remove

# Individual Docker commands
docker build -t real-time-fund .
docker run -d -p 3000:3000 --name fund real-time-fund
docker logs -f fund
docker stop fund && docker rm fund

# Testing tools
bash scripts/test-backup.sh              # Test backup functionality
node scripts/validate-backup.js <file>  # Validate backup file format
```

## Testing Tools

The project includes automated testing tools:

- **`scripts/validate-backup.js`**: Validates exported backup file format and data structure
- **`scripts/test-backup.sh`**: Interactive testing script for export/import functionality
- **`scripts/backup-example.json`**: Example backup file for reference

### E2E Testing (Playwright)

End-to-end tests are located in `tests/e2e/`:
- Authentication flow tests (login, OTP verification, cloud sync)
- Test specs use TypeScript and Playwright framework

```bash
# Run E2E tests (requires running app)
npx playwright test                          # Run all tests
npx playwright test --ui                     # Run with UI
npx playwright test --project=chromium        # Run on specific browser
npx playwright test tests/e2e/auth/login.spec.ts  # Run single file

# View test reports
npx playwright show-report                   # Open HTML report

# Run tests in Docker (recommended approach)
docker compose up -d --build
npx playwright test
docker compose down
```

Playwright configuration:
- Base URL: `http://localhost:3000` (configurable via `BASE_URL` env var)
- Reports: HTML + JSON output to `playwright-report/` and `playwright-results.json`
- Workers: 1 (to avoid race conditions)
- Screenshots/videos: Captured on failure

## Node Version Requirement

Node.js >= 20.9.0 (see package.json engines field). Docker uses Node 22.

## Architecture

### Core Application Structure

- **Single Page App**: `app/page.jsx` (~5000 lines) - Contains all application logic, state management, and UI components
  - **FundDetailModal**: Fund detail popup with historical charts (7d, 1m, 3m, 6m, 12m), holdings, and remove-from-group button
- **Layout**: `app/layout.jsx` - Root layout with Google Analytics integration
- **Styles**: `app/globals.css` - Glassmorphism design system with CSS custom properties
- **Components**: `app/components/` - Reusable UI components (AnalyticsGate, Announcement)
- **Supabase Client**: `app/lib/supabase.js` - Authentication and cloud sync configuration
- **Chart Library**: `recharts` (v3.7.0) - Historical net value trend visualization

### Data Fetching Strategy (JSONP)

The application uses four different CORS-bypassing techniques:

1. **Fund Valuation Data** (天天基金/eastmoney): Script tag injection with global callback interception
   - Dynamically creates `<script>` tags pointing to `fundgz.1234567.com.cn/js/{code}.js`
   - Temporarily overrides `window.jsonpgz` to capture response, then restores original
   - Uses unique callback names to avoid race conditions: `jsonpgz_{code}_{random}`

2. **Fund Search** (东方财富): JSONP with dynamic callback
   - URL: `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashjx`
   - Dynamically creates global callback functions: `SuggestData_{timestamp}`

3. **Historical Net Value** (东方财富): Script tag injection with pagination
   - URL: `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz`
   - Fetches data in pages (500 items per page, max 20 pages)
   - Returns daily net values for specified time periods (7 days, 1/3/6/12 months)
   - Supports both day and month units for flexible time range queries

4. **Stock Quotes** (腾讯财经): Similar script injection approach

### State Management

The app uses React hooks for state management with localStorage persistence:
- `funds`: Array of fund objects with valuation data
- `holdings`: User's fund holdings with amounts and cost basis
- `viewMode`: Table/Card view toggle
- `favorites`: User's favorite funds
- `detailModal`: Fund detail popup state
- `user`: Authenticated user session (Supabase)
- `refreshMs`: Auto-refresh interval (5-300 seconds)

**Data Storage**: All data stored in browser localStorage (not on server)
- Container restart/delete does NOT lose data
- Clearing browser cache DOES lose data
- Use export/import or cloud sync for backup

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
- Modal animations with scale and opacity transitions

### Chart Components (recharts)

**FundDetailModal** uses recharts for historical net value visualization:
- **Time Range Options**: 7 days, 1 month, 3 months, 6 months, 1 year
- `LineChart`: Main chart component
- `Line`: Data line with no dots, active dot on hover
- `XAxis`/`YAxis`: Axis with custom styling
- `CartesianGrid`: Dashed grid lines
- `Tooltip`: Custom tooltip showing exact values
- `ResponsiveContainer`: Full-width responsive chart

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
6. **Modal Pattern**: Click overlay to close, stopPropagation on modal content
7. **Data Merging**: Import uses merge strategy (not replace) to preserve existing data
8. **List View Columns**: Order is - Name, Net Value, Today Change, Yesterday Change, Time, Today Profit, Holding Amount, Holding Profit
9. **Group Management**: Funds can be removed from groups via detail modal button (only shows when viewing a group)

## Backup & Data Persistence

**Critical**: All user data is stored in browser localStorage, not on the server.

### Backup Methods

1. **Export/Import**: In-app export to JSON file, import to restore
2. **Cloud Sync**: Supabase sync for automatic cross-device backup
3. **Manual Backup**: Use `scripts/backup-data.sh` for backup guidance

### Before Data Loss

Always backup before:
- Clearing browser cache
- Changing browsers
- Reinstalling OS
- Upgrading devices

See `docs/DATA_PERSISTENCE.md` for detailed backup instructions.

## Deployment

**GitHub Pages**: Automatic deployment on push to `main` branch via `.github/workflows/nextjs.yml`
- Uses `actions/upload-pages-artifact@v3` to deploy `./out` directory
- Node 20 in CI environment

**Docker**: Multi-stage build (builder + runner stages)
- Exposes port 3000
- Healthcheck included for container monitoring
- `restart: unless-stopped` policy for auto-restart

**Docker Compose**: Recommended for production
- Automatic restart on failure
- Health checks every 30s
- Environment variable configuration

## Environment Notes

- **No build-time environment variables** needed for core functionality
- Supabase credentials are hardcoded in `app/lib/supabase.js` (anon key is safe for client-side)
- Google Analytics only loads on `Nelsontop.github.io` domain (see AnalyticsGate component)
- **Data storage**: All in browser localStorage - container restart does not affect user data

## Common Issues & Solutions

1. **Charts not showing**: Rebuild container with `docker compose up -d --build`
2. **Data lost after clearing cache**: Use import feature to restore from backup
3. **Modal not opening**: Check browser console for errors, ensure recharts is installed
4. **Historical data missing**: May be API limitation, check console for fetch errors

## Documentation Files

- `README.md`: Project overview and quick start
- `docs/DATA_PERSISTENCE.md`: Detailed data backup guide
- `docs/BACKUP_TEST_REPORT.md`: Backup functionality test results
- `CLAUDE.md`: This file - development guidelines
