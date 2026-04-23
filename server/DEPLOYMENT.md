# ChatlockUP Backend Deployment Guide

## Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database
- Environment variables configured

## Environment Setup

### 1. Create Production `.env` file
```bash
# Database connection string
DATABASE_URL=postgresql://user:password@host:5432/chatlockup_prod

# JWT secret (generate a strong random string)
JWT_SECRET=your-super-secret-key-min-32-chars-recommended

# Server settings
PORT=3001
NODE_ENV=production

# Client URL (adjust for production domain)
CLIENT_URL=https://your-production-url.com
```

### 2. Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Steps

### Local/Development
```bash
npm install
npm run db:migrate          # Run migrations
npm run dev                 # Start development server
```

### Production with Vercel/Cloud Deployment

#### 1. Set Environment Variables
In your deployment platform (Vercel, Railway, Render, etc.), set:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Generated secret key
- `CLIENT_URL` - Your frontend URL
- `NODE_ENV` - Set to `production`

#### 2. Build and Deploy
```bash
npm install
npm run db:deploy           # Apply migrations to production DB
npm run prod                # Start production server
```

#### 3. Database Setup
Make sure your PostgreSQL database exists and migrations are applied:
```bash
npx prisma migrate deploy
```

## Key Features Added
✓ Environment variable validation
✓ Graceful shutdown handling (SIGTERM/SIGINT)
✓ Request logging middleware
✓ Global error handling
✓ WebSocket token authentication
✓ Input validation on all routes
✓ Rate limiting per endpoint
✓ Helmet security headers
✓ CORS configuration
✓ Proper error messages for production

## Security Checklist
- [ ] Set strong JWT_SECRET (min 32 characters)
- [ ] Use HTTPS in production
- [ ] Database credentials in environment variables only
- [ ] CLIENT_URL matches your production domain
- [ ] Rate limiting adjusted for expected load
- [ ] CORS origins properly configured
- [ ] Database backups configured
- [ ] Monitoring/logging setup
- [ ] Error tracking (e.g., Sentry) configured

## Monitoring

### Health Check
```bash
curl http://localhost:3001/
# Expected: {"status":"ok","service":"chatlockup-api"}
```

### Logs
The server logs:
- Database connection status
- Request details (method, path, status, duration)
- Socket.io connections/disconnections
- Errors and exceptions

## Troubleshooting

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- Ensure database/schema exists

### Token Verification Failures
- Ensure `JWT_SECRET` matches between client and server
- Check token hasn't expired (7 day expiration)

### CORS Errors
- Verify `CLIENT_URL` is in ALLOWED_ORIGINS
- Check browser console for specific origin

### High Memory Usage
- Monitor WebSocket connections (users map)
- Ensure offline messages are being delivered
- Check for connection leaks in socket handlers

## Scaling Considerations

For production scale:
1. Use connection pooling (PgBouncer)
2. Add Redis for message caching/queue
3. Implement database read replicas
4. Use CDN for static assets
5. Monitor and alert on error rates
6. Implement request tracing/APM
