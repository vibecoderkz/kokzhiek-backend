# Deployment Guide for Render.com

## Prerequisites
1. Create a Render.com account
2. Set up your GitHub repository
3. Configure environment variables

## Environment Variables (Required for Production)

Before deploying, you must configure these environment variables in your Render dashboard:

### Required Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure JWT secret (32+ characters)
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password/app password
- `FROM_EMAIL` - Sender email address
- `FROM_NAME` - Sender name
- `FRONTEND_URL` - Your frontend application URL
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### Optional Variables (have defaults):
- `NODE_ENV` - Set to "production" (auto-configured)
- `PORT` - Set to 10000 (auto-configured)
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `SERVICE_VERSION` - Service version (default: 1.0.0)

## Deployment Steps

1. **Connect Repository**: Link your GitHub repository to Render
2. **Create Web Service**: Select "Web Service" from the Render dashboard
3. **Configure Service**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/health`
4. **Set Environment Variables**: Configure all required variables in the Render dashboard
5. **Deploy**: Render will automatically build and deploy your application

## Database Setup

If using Render's PostgreSQL:
1. Create a PostgreSQL database in Render
2. Copy the database connection string
3. Set it as the `DATABASE_URL` environment variable

## Post-Deployment

1. Test the health endpoint: `https://your-app.onrender.com/health`
2. Verify API endpoints are working
3. Check logs for any deployment issues
4. Update your frontend to use the production API URL

## Monitoring

- Use Render's built-in logs and metrics
- Monitor the `/health` endpoint for service status
- Set up alerts for service downtime

## Troubleshooting

Common issues:
- **Build failures**: Check Node.js version compatibility
- **Database connection**: Verify DATABASE_URL format
- **CORS errors**: Update ALLOWED_ORIGINS with your frontend domain
- **Email issues**: Verify SMTP credentials and settings