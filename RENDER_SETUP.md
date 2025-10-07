# 🚀 Render.com Deployment Setup

## Current Status
❌ **Backend is failing to start** because environment variables are not configured in Render Dashboard.

Error:
```
Error: No database connection string was provided to `neon()`. 
Perhaps an environment variable has not been set?
```

## 🔧 How to Fix

### Step 1: Go to Render Dashboard
1. Visit https://dashboard.render.com
2. Find and click on **kokzhiek-backend** service

### Step 2: Add Environment Variables
Click on **Environment** tab and add these variables:

#### ✅ Required Variables (Service won't start without these):

```
DATABASE_URL
postgresql://neondb_owner:npg_bJGhdRAU1rH3@ep-fragrant-king-afj71ude-pooler.c-2.us-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

```
JWT_SECRET
kokzhiek_super_secret_jwt_key_2024_production_secure_min_32_chars
```

```
NODE_ENV
production
```

#### 🔹 Recommended Variables:

```
JWT_EXPIRES_IN
7d
```

```
PORT
3000
```

```
FRONTEND_URL
https://kokzhiek-new.vercel.app
```

```
ALLOWED_ORIGINS
https://kokzhiek-new.vercel.app,https://kokzhiek.icai.kz,http://localhost:5173
```

#### 📧 Email Variables (Optional - if you need email functionality):

```
SMTP_HOST
smtp.gmail.com
```

```
SMTP_PORT
587
```

```
SMTP_USER
info@aicrewconnect.com
```

```
SMTP_PASS
jukl oucs kqoy cgtc
```

```
FROM_EMAIL
noreply@aicrewconnect.com
```

```
FROM_NAME
Kokzhiek
```

### Step 3: Save and Redeploy
1. Click **Save Changes**
2. Render will automatically redeploy the service
3. Wait 2-3 minutes for deployment to complete
4. Check https://kokzhiek-backend-7uqp.onrender.com/health

## ✅ Success Check

Once configured, you should see:
```json
{
  "service": "kokzhiek-editor-backend",
  "version": "1.0.0",
  "status": "healthy",
  "timestamp": "2025-10-07T..."
}
```

## 🔒 Security Notes

- ⚠️ Never commit `.env` file to git
- ✅ Use `.env.example` for documentation
- 🔐 Keep DATABASE_URL and JWT_SECRET secret
- 🔄 Rotate secrets regularly in production

## 📝 Current URLs

- **Backend (Render)**: https://kokzhiek-backend-7uqp.onrender.com
- **Frontend (Vercel)**: https://kokzhiek-new.vercel.app
- **Database**: Neon.tech PostgreSQL (us-west-2)

## 🆘 Troubleshooting

If backend still fails after adding variables:

1. Check Render logs for specific errors
2. Verify DATABASE_URL is exactly as shown (no extra spaces)
3. Make sure all required variables are added
4. Try manual redeploy from Render dashboard
5. Check database is accessible from Render's IP range

## 📞 Support

- Render Docs: https://render.com/docs
- Neon Docs: https://neon.tech/docs
