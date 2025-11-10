import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import bookRoutes from './routes/books';
import chapterRoutes from './routes/chapters';
import blockRoutes from './routes/blocks';
import publicRoutes from './routes/public';
import exportRoutes from './routes/export';
import searchRoutes from './routes/search';
import auditRoutes from './routes/auditRoutes';
import uploadRoutes from './routes/upload';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './config/swagger';
import { setupAuditLogCleanup } from './jobs/auditLogCleanup';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// SECURITY: Trust Proxy Configuration for Render.com
// =====================================
// For Render.com deployment, we trust only the first proxy (value: 1)
// This allows us to get the real client IP from X-Forwarded-For header
// while preventing IP spoofing attacks that could bypass rate limiting.
//
// DO NOT set to 'true' - that would trust all proxies and allow
// attackers to spoof their IP address to bypass rate limits.
//
// Reference: https://expressjs.com/en/guide/behind-proxies.html
// Security reference: https://express-rate-limit.github.io/ERR_ERL_PERMISSIVE_TRUST_PROXY/
app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any localhost port or from allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');

    // Allow all Vercel preview deployments
    const isVercelDeploy = origin?.includes('.vercel.app');

    if (!origin || isLocalhost || isVercelDeploy || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
}));

// SECURITY: Rate Limiting Configuration
// =====================================
// This rate limiter works correctly with the trust proxy setting above.
// It uses req.ip which is now secure thanks to the 'trust proxy: 1' setting.
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});

app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Setup Swagger documentation
setupSwagger(app);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'kokzhiek-editor-backend',
    version: process.env.SERVICE_VERSION || '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/upload', uploadRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Kokzhiek Editor Backend running on port ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);

    // Setup cron jobs for audit log cleanup
    setupAuditLogCleanup();
  });
}

export default app;