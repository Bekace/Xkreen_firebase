# OAuth Configuration Guide

## Overview
This document explains how to configure OAuth (Google, Apple) authentication for the xKreen platform.

## Current Configuration

### Redirect URLs
The application uses the following redirect URLs for OAuth:

**Production:**
\`\`\`
https://v0-xkreen-ai.vercel.app/auth/callback
\`\`\`

**Development:**
\`\`\`
http://localhost:3000/auth/callback
\`\`\`

### Environment Variables

The OAuth system uses these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_SITE_URL` - Production site URL (https://v0-xkreen-ai.vercel.app)
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` - Development redirect URL (optional)

## Supabase Configuration Steps

### 1. Configure Redirect URLs in Supabase

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:
   \`\`\`
   https://v0-xkreen-ai.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   \`\`\`

### 2. Configure Google OAuth

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

4. In Google Cloud Console (https://console.cloud.google.com):
   - Go to **APIs & Services** → **Credentials**
   - Select your OAuth 2.0 Client ID
   - Add to **Authorized redirect URIs**:
     \`\`\`
     https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
     \`\`\`

### 3. Configure Apple OAuth (Optional)

1. Go to **Authentication** → **Providers** → **Apple**
2. Enable Apple provider
3. Add your Apple OAuth credentials:
   - **Services ID**
   - **Team ID**
   - **Key ID**
   - **Private Key**

4. In Apple Developer Console:
   - Configure Return URLs:
     \`\`\`
     https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
     \`\`\`

## How OAuth Flow Works

### Sign Up Flow
\`\`\`
User clicks "Continue with Google"
  ↓
components/oauth-buttons.tsx initiates OAuth
  ↓
Supabase redirects to Google for authentication
  ↓
Google redirects back to: /auth/callback?code=...&mode=signup
  ↓
app/auth/callback/route.ts exchanges code for session
  ↓
Creates user profile if doesn't exist
  ↓
Assigns Free plan subscription
  ↓
Redirects to /dashboard?welcome=true
\`\`\`

### Login Flow
\`\`\`
User clicks "Continue with Google" on login page
  ↓
components/oauth-buttons.tsx initiates OAuth with mode=login
  ↓
Supabase redirects to Google for authentication
  ↓
Google redirects back to: /auth/callback?code=...&mode=login
  ↓
app/auth/callback/route.ts exchanges code for session
  ↓
Checks if profile exists
  ↓
If profile doesn't exist: signs out user and shows error
If profile exists: redirects to /dashboard
\`\`\`

## Troubleshooting

### Error: "Invalid redirect URL"
**Solution:** Ensure the redirect URL is added to Supabase's allowed list:
- Go to Supabase Dashboard → Authentication → URL Configuration
- Add `https://v0-xkreen-ai.vercel.app/auth/callback`

### Error: "OAuth provider not configured"
**Solution:** 
1. Check that Google/Apple provider is enabled in Supabase
2. Verify OAuth credentials are correctly entered
3. Confirm redirect URIs in Google/Apple console match Supabase's callback URL

### Error: "No account found" (Login mode)
**Cause:** User tries to login with OAuth but no profile exists
**Solution:** User should sign up first, then login

### Development OAuth Not Working
**Solution:** 
1. Add `http://localhost:3000/auth/callback` to Supabase redirect URLs
2. Set environment variable:
   \`\`\`bash
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
   \`\`\`

## Code References

### OAuth Button Component
Location: `components/oauth-buttons.tsx`
- Handles OAuth initiation
- Supports both login and signup modes
- Uses environment-aware redirect URLs

### OAuth Callback Handler
Location: `app/auth/callback/route.ts`
- Exchanges OAuth code for session
- Creates/verifies user profile
- Handles subscription assignment
- Implements mode-specific logic (login vs signup)

### Redirect URL Configuration
Location: `components/oauth-buttons.tsx:23`
\`\`\`typescript
const redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
                    `${window.location.origin}/auth/callback`
\`\`\`

## Production Checklist

Before deploying to production:

- [ ] Add production redirect URL to Supabase (`https://v0-xkreen-ai.vercel.app/auth/callback`)
- [ ] Configure Google OAuth provider in Supabase
- [ ] Add Supabase callback URL to Google Cloud Console
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://v0-xkreen-ai.vercel.app` in Vercel
- [ ] Test Google login flow in production
- [ ] Test Google signup flow in production
- [ ] Verify user profiles are created correctly
- [ ] Verify Free plan subscription is assigned

## Environment Variables Reference

Required in Vercel/Production:
\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://v0-xkreen-ai.vercel.app
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

Optional for Development:
\`\`\`bash
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
