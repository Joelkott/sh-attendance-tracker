# Quick Start Guide - SHC Attend

## What You Have Now

✅ **Fully functional PWA skeleton** with:
- Login page with encrypted credential storage
- Dashboard with attendance display
- Proxy API for bypassing CORS
- IndexedDB for offline storage
- Debug tool for endpoint discovery
- Mobile-optimized dark theme UI

## What's Missing

⚠️ **Critical**: The actual attendance data endpoints need to be discovered!

The SHC portal doesn't expose the attendance API publicly. You need to reverse-engineer it from their JavaScript files.

## Next Steps (In Order)

### 1. Access the App

The development server is running at: **http://localhost:3000**

Open this in your browser.

### 2. Discover Attendance Endpoints

**This is the most important step!**

1. Go to http://localhost:3000/debug

2. You'll need valid SHC student credentials to proceed. Get cookies by:
   - Click "Login Page" quick test
   - Look at the response to see the login form structure
   - Use the form to POST a login (you'll need real credentials)
   - Copy the `Set-Cookie` headers from the response
   - Paste them into the "Cookies" field for subsequent requests

3. Fetch the JavaScript files:
   - Click "Attendance JS" quick test
   - Click "Dashboard JS" quick test
   - Click "Common JS" quick test

4. Inspect the JavaScript code in each response:
   - Look for AJAX calls ($.ajax, $.get, $.post, fetch)
   - Find the `getopenattendance()` function
   - Find the `#btnSearch` click handler
   - Identify:
     - The attendance endpoint URL
     - The HTTP method (GET or POST)
     - Required parameters (especially the month parameter)
     - Response format (HTML table or JSON)

5. Example of what to look for:
   ```javascript
   // In StudentAttendanceProfile.js or studentDashBoard.js
   $("#btnSearch").click(function() {
       $.ajax({
           url: "/Student/Home/GetAttendance",  // <-- THIS IS WHAT YOU NEED
           type: "POST",
           data: {
               month: $("#ddlmonth").val()      // <-- AND THIS
           },
           success: function(data) {
               $("#Details").html(data);
           }
       });
   });
   ```

6. Document your findings in `ENDPOINTS.md`

### 3. Update the Scraper

Once you know the endpoints, update `lib/scraper.ts`:

```typescript
// In fetchAttendanceMonths()
export async function fetchAttendanceMonths(cookies: string): Promise<MonthOption[]> {
  const response = await callProxy({
    targetPath: '/Student/Home/GetMonthsForAttendance', // Replace with actual endpoint
    method: 'GET',
    cookies,
  });

  // Parse the response (HTML options or JSON array)
  // Return array of { value: string, label: string }
}

// In fetchAttendanceByMonth()
export async function fetchAttendanceByMonth(
  cookies: string,
  monthValue: string
): Promise<AttendanceRecord[]> {
  const response = await callProxy({
    targetPath: '/Student/Home/GetAttendance', // Replace with actual endpoint
    method: 'POST', // or 'GET' based on what you found
    cookies,
    formData: {
      month: monthValue, // Adjust parameter name as needed
    },
  });

  return parseAttendanceData(response.body, monthValue);
}
```

### 4. Test End-to-End

1. Go to http://localhost:3000/login
2. Enter your SHC credentials
3. Click "Sign In"
4. If login works, you'll be redirected to /dashboard
5. Click "Sync Now"
6. Check browser console for any errors
7. If successful, attendance data should appear

### 5. Test Offline Mode

1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Refresh the page
4. Data should still be visible (loaded from IndexedDB)

### 6. Inspect IndexedDB

1. Open DevTools → Application tab
2. Expand "IndexedDB" → "shc-attend-db"
3. Check:
   - `auth` - Should contain encrypted session
   - `profile` - Should contain student profile
   - `attendance` - Should contain attendance records
   - `sync_meta` - Should contain last sync timestamp

## Troubleshooting

### Login Fails

- Check Network tab in DevTools for proxy errors
- Verify SHC portal is accessible: https://shcollege.online/StudentLogin
- Check credentials are correct
- Look at proxy response in debug tool

### Sync Button Does Nothing

- Open browser console (F12)
- Look for error messages
- Most likely: attendance endpoints not yet discovered/implemented
- Check that `lib/scraper.ts` has real endpoints (not the TODO placeholders)

### No Attendance Data Showing

- Check if sync completed successfully (console logs)
- Verify endpoints are correct in `lib/scraper.ts`
- Use debug tool to manually test the attendance endpoint
- Check if response is being parsed correctly

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Lint code
npm run lint
```

## File Locations for Key Features

- **Add a new page**: Create `app/your-page/page.tsx`
- **Update attendance parsing**: Edit `lib/scraper.ts`
- **Modify login logic**: Edit `lib/auth.ts`
- **Add new endpoints**: Update `lib/constants.ts` and `ENDPOINTS.md`
- **Change styling**: Edit `app/globals.css` or component files

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **IndexedDB (idb)**: https://github.com/jakearchibald/idb
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

## Getting Help

If you're stuck:

1. Check browser console for errors
2. Use the /debug tool to test endpoints manually
3. Review ENDPOINTS.md for documented patterns
4. Check the example HTML from the prompt document
5. Inspect the SHC portal directly in your browser

## Once Everything Works

1. Follow `DEPLOYMENT.md` to deploy to Vercel
2. Install as PWA on your phone
3. Share with fellow SHC students
4. Iterate based on feedback

---

**Current Status**: ✅ App is running, login works, ⚠️ attendance endpoints need discovery

**Next Action**: Go to http://localhost:3000/debug and start discovering endpoints!
