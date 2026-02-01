# OAuth Setup Guide

This guide will help you configure Google, Apple, and GitHub authentication for your Revisent dashboard.

## Prerequisites

- A Supabase project (you already have this)
- Access to your Supabase dashboard at https://app.supabase.com

## OAuth Providers Configuration

### 1. Google OAuth

#### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application** as the application type
6. Add authorized redirect URIs:
   ```
   https://xyfhvxovruqfealplzws.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**

#### Step 2: Configure in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com/project/xyfhvxovruqfealplzws
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and toggle it to enabled
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

---

### 2. Apple OAuth

#### Step 1: Create Apple Sign In Service

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (to add new)
4. Select **Services IDs** and click **Continue**
5. Register a new Service ID (e.g., `com.revisent.dashboard`)
6. Enable **Sign In with Apple**
7. Configure domains and return URLs:
   - Domain: `xyfhvxovruqfealplzws.supabase.co`
   - Return URL: `https://xyfhvxovruqfealplzws.supabase.co/auth/v1/callback`
8. Create a private key for Sign In with Apple
9. Download the key file (.p8)

#### Step 2: Configure in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Apple** and toggle it to enabled
4. Fill in:
   - **Services ID** (e.g., `com.revisent.dashboard`)
   - **Team ID** (from Apple Developer Portal)
   - **Key ID** (from the .p8 key)
   - **Private Key** (contents of the .p8 file)
5. Click **Save**

---

### 3. GitHub OAuth

#### Step 1: Create GitHub OAuth App

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the application details:
   - **Application name**: Revisent Dashboard
   - **Homepage URL**: https://your-domain.com (or http://localhost:3000 for development)
   - **Authorization callback URL**:
     ```
     https://xyfhvxovruqfealplzws.supabase.co/auth/v1/callback
     ```
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

#### Step 2: Configure in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **GitHub** and toggle it to enabled
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

---

## Development Setup

### Local Development URLs

When testing locally (http://localhost:3000), you'll need to add local callback URLs to your OAuth apps:

**Google:**
- Add `http://localhost:3000/auth/callback` to authorized redirect URIs

**Apple:**
- Apple doesn't allow localhost, you'll need to use production or a tunnel service like ngrok

**GitHub:**
- Add `http://localhost:3000/auth/callback` to authorization callback URL

### Supabase Site URL

Make sure your Supabase site URL is configured correctly:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

---

## Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login

3. Try each OAuth provider:
   - Click "Continue with Google"
   - Click "Continue with Apple"
   - Click "Continue with GitHub"

4. After successful authentication, you should be redirected to the appropriate dashboard based on your role

---

## Production Deployment

When deploying to production:

1. Update OAuth app redirect URIs to use your production domain
2. Update Supabase Site URL to your production domain
3. Add production redirect URLs to Supabase URL configuration
4. Set environment variables in Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xyfhvxovruqfealplzws.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Troubleshooting

### "Invalid redirect URI" error
- Make sure the redirect URI in your OAuth app matches exactly with Supabase
- Check for trailing slashes
- Verify protocol (http vs https)

### "Provider not configured" error
- Ensure the provider is enabled in Supabase
- Verify Client ID and Secret are correct
- Check that you clicked Save in Supabase

### Users not getting assigned roles
- OAuth users are assigned the 'client' role by default
- To make a user an admin, run this SQL in Supabase:
  ```sql
  update profiles
  set role = 'admin'
  where email = 'user@example.com';
  ```

---

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables for sensitive data
- Rotate secrets regularly
- Enable only the OAuth providers you need
- Review and limit OAuth scopes to minimum required permissions

---

For more information, see:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
