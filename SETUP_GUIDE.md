# Database Setup Guide

## Quick Database Setup Options

### Option 1: Neon.tech (Recommended - Free Tier Available)

1. **Create Account**: Go to [neon.tech](https://neon.tech) and sign up
2. **Create Database**: Create a new PostgreSQL database
3. **Get Connection String**: Copy the connection string from your dashboard
4. **Add to .env**:

```bash
# Add this to your .env file
DATABASE_URL=postgresql://username:password@ep-example.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### Option 2: Local PostgreSQL

1. **Install PostgreSQL**: Download from [postgresql.org](https://postgresql.org)
2. **Create Database**:
```sql
CREATE DATABASE kokzhiek_editor;
CREATE USER kokzhiek_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE kokzhiek_editor TO kokzhiek_user;
```
3. **Add to .env**:
```bash
DATABASE_URL=postgresql://kokzhiek_user:your_password@localhost:5432/kokzhiek_editor
```

### Option 3: Railway (Free Tier)

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Create PostgreSQL**: Add PostgreSQL service to your project
3. **Get Connection**: Copy the PostgreSQL connection URL
4. **Add to .env**:
```bash
DATABASE_URL=postgresql://postgres:password@hostname:port/railway
```

### Option 4: Supabase (Free Tier)

1. **Create Project**: Go to [supabase.com](https://supabase.com)
2. **Get Database URL**: Go to Settings > Database > Connection string
3. **Add to .env**:
```bash
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

## After Setting Up Database

### 1. Install Dependencies (if not done)
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and add your DATABASE_URL:
```bash
cp .env.example .env
# Edit .env file with your database connection string
```

### 3. Push Migrations
```bash
npm run db:migrate
```

### 4. Create Super Admin
```bash
npm run create-super-admin
```

This will create:
- **Admin User**: `admin@kokzhiek.com` / `AdminPass123!`
- **Registration Key**: `INIT-2024-XXXXX` (10 uses)

### 5. Test the Setup
```bash
npm run dev
```

Visit: `http://localhost:3000/health`

## Environment Variables Template

```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourapp.com
FROM_NAME="Your App Name"

# Frontend
FRONTEND_URL=http://localhost:5173

# Server
PORT=3000
NODE_ENV=development
```

## Gmail SMTP Setup (For Email Features)

1. **Enable 2FA**: Enable two-factor authentication on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use App Password**: Use the generated 16-character password as `SMTP_PASS`

## Verification

After setup, you can test the endpoints:

### Test Registration Key
```bash
curl -X POST http://localhost:3000/api/auth/validate-key \
  -H "Content-Type: application/json" \
  -d '{"registrationKey":"INIT-2024-XXXXX"}'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kokzhiek.com","password":"AdminPass123!"}'
```

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!",
    "firstName":"Test",
    "lastName":"User",
    "registrationKey":"INIT-2024-XXXXX"
  }'
```

## Troubleshooting

### Migration Errors
- Ensure DATABASE_URL is correct
- Check database permissions
- Verify network connectivity

### Email Not Working
- Verify SMTP credentials
- Check Gmail app password (not regular password)
- Test SMTP connection

### JWT Errors
- Ensure JWT_SECRET is at least 32 characters
- Check for special characters in environment variables

### Connection Refused
- Verify database is running
- Check firewall settings
- Confirm connection string format

---

🎉 **You're all set!** The authentication system is ready for development.