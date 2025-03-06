# Project Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- Supabase CLI
- Git

## Setup Steps

### 1. Supabase Configuration

#### Database Setup
1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```
2. Login to Supabase:
   ```bash
   supabase login
   ```
3. Import database dump:
   ```bash
   psql -h YOUR_DB_HOST -U postgres -d postgres -f db_dump.sql
   ```

#### Edge Functions Setup
1. Navigate to your Supabase project dashboard
2. Go to Edge Functions section
3. Deploy the edge functions:
   ```bash
   supabase functions deploy
   ```

### 2. SMTP Server Configuration
1. Set up your SMTP server credentials
2. Configure the following settings in your Supabase project:
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASSWORD
   - SMTP_FROM_EMAIL

### 3. Environment Variables

#### Supabase Environment Variables
Configure the following in your Supabase dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SMTP_*` variables (from step 2)

#### Local Environment Variables
1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the required environment variables in `.env.local`

### 4. Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Access the application at `http://localhost:5173`

## Additional Notes
- Make sure all environment variables are properly set before starting the application
- For production deployment, ensure all secrets are securely stored
- Keep your Supabase project credentials secure

## Troubleshooting
If you encounter any issues:
1. Verify all environment variables are correctly set
2. Ensure database migrations are up to date
3. Check Supabase dashboard for any service disruptions
4. Verify SMTP server connectivity

## Support
For additional support, please open an issue in the repository or contact the development team.
