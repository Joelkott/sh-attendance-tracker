# Deployment Guide for SHC Attend

## Quick Vercel Deployment

### Step 1: Prepare Repository

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SHC Attend PWA"
   ```

2. Push to GitHub:
   ```bash
   gh repo create shc-attend --public --source=. --push
   ```
   Or manually create a repo on GitHub and push.

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow prompts:
   - Set up and deploy: Yes
   - Project name: shc-attend (or your choice)
   - Deploy: Yes

5. Deploy to production:
   ```bash
   vercel --prod
   ```

#### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: (leave default)
5. Add Environment Variables:
   ```
   SHC_BASE_URL=https://shcollege.online
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  (fill this after first deploy)
   DEBUG_MODE=false
   ```
6. Click "Deploy"

### Step 3: Update Environment Variables

After first deployment, update `NEXT_PUBLIC_APP_URL`:

1. Go to Project Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL` to match your deployment URL (e.g., `https://shc-attend.vercel.app`)
3. Redeploy

### Step 4: Test the Deployment

1. Visit your deployment URL
2. Try logging in with SHC credentials
3. Check that the debug page works (if DEBUG_MODE=true)
4. Test sync functionality
5. Test PWA installation on mobile

## Custom Domain (Optional)

1. In Vercel dashboard, go to Project → Settings → Domains
2. Add your custom domain (e.g., `attend.yourdomain.com`)
3. Follow Vercel's DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

## Post-Deployment Checklist

- [ ] App loads correctly
- [ ] Login works with real SHC credentials
- [ ] Debug tool accessible (if enabled)
- [ ] Attendance endpoints discovered and implemented
- [ ] Sync functionality tested
- [ ] PWA installable on mobile (HTTPS required)
- [ ] Offline mode works
- [ ] IndexedDB storing data correctly

## Monitoring

Vercel provides:
- **Analytics**: Built-in web analytics
- **Logs**: Function logs in dashboard
- **Performance**: Web Vitals tracking

Access via: Vercel Dashboard → Your Project → Analytics/Logs

## Troubleshooting

### Build Fails

Check build logs in Vercel dashboard. Common issues:
- TypeScript errors: Fix in your code
- Missing dependencies: Check package.json
- Environment variables: Ensure all are set

### 404 Errors on API Routes

- Ensure Edge runtime is enabled in route files
- Check CORS headers are correct
- Verify proxy route is at `app/api/proxy/route.ts`

### PWA Not Installing

- Must be served over HTTPS (Vercel provides this automatically)
- Check manifest.json is accessible at `/manifest.json`
- Ensure icons are present (even placeholder ones)
- Check browser console for service worker errors

## Updating the App

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. Vercel auto-deploys on push to main branch

Or use Vercel CLI:
```bash
vercel --prod
```

## Costs

**Vercel Free Tier includes:**
- 100GB bandwidth/month
- 500k Edge Function invocations/month
- Unlimited static requests
- HTTPS/SSL certificates
- Automatic deployments

This app uses approximately:
- ~1KB per login
- ~10KB per sync (depends on attendance data)
- Typical student: ~10-20 syncs/month = ~200KB/month
- **Well within free tier limits**

## Security Notes for Production

1. **Never expose real student credentials in logs**
2. **Set DEBUG_MODE=false in production**
3. **Regularly update dependencies** for security patches
4. **Monitor Vercel logs** for unusual activity
5. **Consider rate limiting** if abuse detected

## Rollback

If a deployment breaks:

1. Via Dashboard:
   - Go to Deployments tab
   - Find last working deployment
   - Click "Promote to Production"

2. Via CLI:
   ```bash
   vercel rollback
   ```

---

## Next Steps After Deployment

1. Share the URL with fellow SHC students
2. Gather feedback on bugs/issues
3. Discover remaining attendance endpoints
4. Iterate on UI/UX improvements
5. Consider adding features like notifications, export to PDF, etc.
