# SHC Attend

A mobile-first Progressive Web App (PWA) that lets Sacred Heart College Thevara students view their attendance data offline with minimal network usage.

## Features

- **Offline-First**: All attendance data is cached locally in IndexedDB for instant access
- **Privacy-Focused**: Credentials encrypted with AES-256-GCM, stored locally only
- **Minimal Data Usage**: Sync-on-demand pattern - only fetches when you need it
- **Mobile-Optimized**: Dark theme, touch-friendly UI, works great on phones
- **No Backend Database**: Stateless proxy, all intelligence on the client
- **Free Hosting**: Runs on Vercel's free tier (Edge Functions)

## Architecture

```
[Phone Browser/PWA]
    ↕ (fetch calls)
[Vercel Edge Functions - thin CORS proxy]
    ↕ (proxied requests with cookies)
[SHC Portal - shcollege.online]
```

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Client Storage**: IndexedDB via `idb` library
- **PWA**: `@serwist/next`
- **Deployment**: Vercel (free tier)
- **No external services, no backend database**

## Project Structure

```
shc-attend/
├── app/
│   ├── api/proxy/route.ts          # Edge function CORS proxy
│   ├── login/page.tsx              # Login page
│   ├── dashboard/page.tsx          # Main dashboard
│   ├── debug/page.tsx              # Dev-only endpoint discovery tool
│   └── layout.tsx                  # Root layout
├── lib/
│   ├── auth.ts                     # Login/session management
│   ├── scraper.ts                  # HTML/JSON parsing
│   ├── db.ts                       # IndexedDB wrapper
│   ├── crypto.ts                   # Web Crypto encryption
│   ├── types.ts                    # TypeScript types
│   └── constants.ts                # Config & endpoints
├── hooks/
│   ├── useAuth.ts                  # Auth state hook
│   ├── useSync.ts                  # Sync orchestration
│   └── useOffline.ts               # Network status
└── public/
    └── manifest.json               # PWA manifest
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd shc-attend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Development Workflow

#### Step 1: Discover Endpoints (IMPORTANT!)

Before the app can fetch attendance data, you need to discover the actual endpoints by inspecting the SHC portal's JavaScript files:

1. Navigate to [http://localhost:3000/debug](http://localhost:3000/debug)
2. Use the "Quick Tests" to fetch:
   - `Attendance JS` - Contains attendance endpoint logic
   - `Dashboard JS` - Contains modal and search logic
   - `Common JS` - Shared utilities
3. Inspect the raw JavaScript code to find:
   - The attendance data endpoint (likely `/Student/Home/GetAttendance`)
   - Month dropdown endpoint
   - Required parameters
4. Update `lib/scraper.ts` with the discovered endpoints
5. Document findings in `ENDPOINTS.md`

#### Step 2: Implement Scrapers

Once endpoints are discovered:

1. Update `fetchAttendanceMonths()` in `lib/scraper.ts`
2. Update `fetchAttendanceByMonth()` with the correct endpoint and params
3. Test with the debug tool to verify parsing

#### Step 3: Test End-to-End

1. Login with actual SHC credentials
2. Trigger a sync from the dashboard
3. Verify attendance data is cached in IndexedDB (check DevTools → Application → IndexedDB)
4. Go offline and verify data is still accessible

## Environment Variables

Create a `.env.local` file:

```env
SHC_BASE_URL=https://shcollege.online
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEBUG_MODE=true
MOCK_MODE=false
```

For production (Vercel):

```env
SHC_BASE_URL=https://shcollege.online
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
DEBUG_MODE=false
```

## Deployment

### Deploy to Vercel

1. Push to GitHub

2. Import to Vercel:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

4. Deploy:
   ```bash
   vercel --prod
   ```

### Install as PWA

After deployment:

1. Open the app on your phone
2. Add to Home Screen (iOS: Share → Add to Home Screen)
3. Launch from home screen like a native app

## Security Notes

⚠️ **Important Security Considerations**:

- Credentials are encrypted with AES-256-GCM and stored in IndexedDB
- The encryption key is also stored in IndexedDB (not bulletproof - someone with device access can extract it)
- Credentials are ONLY sent to the official SHC portal, never to any other server
- The Vercel proxy is stateless and does NOT log or store credentials
- This app is for personal use - never share your credentials

## Known Limitations

- **Endpoint Discovery Required**: The attendance endpoints are not yet discovered. You must use the debug tool to find them by inspecting the SHC portal's JavaScript files.
- **Scraper Brittleness**: If SHC changes their site structure, the parsers will break
- **Client-Side Encryption**: Not fully secure against physical device access
- **No Auto-Sync**: Sync is manual to minimize data usage

## Troubleshooting

### "Failed to proxy request"
- Check that `SHC_BASE_URL` is correct
- Verify the SHC portal is accessible

### "Failed to decrypt data"
- Clear IndexedDB and re-login
- Check that encryption key wasn't corrupted

### Attendance data not showing
- Ensure you've completed Step 1 (Endpoint Discovery)
- Check `lib/scraper.ts` has the correct endpoint URLs
- Use the debug tool to inspect raw responses

### PWA not installing
- Ensure HTTPS (required for PWA)
- Check `manifest.json` is accessible
- Verify service worker is registered

## Contributing

This is a personal project for SHC students. Contributions welcome!

## Privacy & Ethics

This app:
- ✅ Only accesses data the student already has permission to view
- ✅ Stores data locally on the student's device
- ✅ Never transmits credentials to third parties
- ✅ Is transparent about how it works (open source)

## License

MIT

## Disclaimer

This is an unofficial app, not affiliated with Sacred Heart College Thevara or Kris Inventa (the ERP provider). Use at your own risk. The developers are not responsible for any issues with your account or data.

---

**Next Steps After Setup:**

1. ✅ Project scaffolded
2. ✅ Proxy API built
3. ⏳ **Discover endpoints** using `/debug`
4. ⏳ Update scrapers with real endpoints
5. ⏳ Test with real credentials
6. ⏳ Deploy to Vercel
7. ⏳ Install as PWA on phone
