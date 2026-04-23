# Deploying ChatlockUP Backend to Render

This guide will help you deploy the backend server to Render.com.

## Prerequisites

1. **Render Account** - Sign up at [render.com](https://render.com)
2. **GitHub Repository** - Push your code to GitHub
3. **Environment Variables** - JWT_SECRET and CLIENT_URL ready

## Option 1: Deploy with render.yaml (Recommended)

### Step 1: Connect Repository to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Select the branch to deploy

### Step 2: Configure Blueprint

The `render.yaml` file will automatically:
- Create a Node.js web service
- Create a PostgreSQL database
- Set up environment variables
- Configure the database connection

### Step 3: Set Required Secrets

After blueprint deploys, update these environment variables in the Render dashboard:

1. **JWT_SECRET** (Required)
   - Go to your service → Environment
   - Add environment variable `JWT_SECRET` with a strong random value
   - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **CLIENT_URL** (Required)
   - Add environment variable `CLIENT_URL` with your frontend URL
   - Example: `https://chatlock-up.vercel.app`

### Step 4: Deploy

Click **Deploy** in the Render dashboard. The service will:
1. Install dependencies
2. Run database migrations
3. Start the server

## Option 2: Manual Deployment (Without render.yaml)

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Select **Build and deploy from a Git repository**
4. Connect your GitHub repository
5. Choose branch to deploy

### Step 2: Configure Web Service

**Name:** `chatlockup-backend`

**Runtime:** Node

**Root Directory:** `server/`

**Build Command:** `npm install`

**Start Command:** `npm start`

**Plan:** Starter (free tier)

### Step 3: Create PostgreSQL Database

1. In Render Dashboard, click **New +** → **PostgreSQL**
2. **Name:** `chatlockup-db`
3. **Database:** `chatlockup_prod`
4. **User:** `chatlockup_user`
5. **Region:** Oregon (or your preference)
6. **Plan:** Starter (free tier)

### Step 4: Set Environment Variables

Go to Web Service → Environment and add:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate-strong-secret>
CLIENT_URL=https://your-frontend-url.com
DATABASE_URL=<will-be-auto-filled-from-database>
```

To get the DATABASE_URL:
1. Go to PostgreSQL database in Render
2. Copy the "Internal Database URL" (for services within Render)
3. Or use "External Database URL" if connecting from outside

### Step 5: Deploy

1. Click **Create Web Service**
2. Render will automatically build and deploy
3. Check logs to verify deployment

## Post-Deployment

### 1. Verify Health Check

```bash
curl https://chatlockup-backend.onrender.com/
# Should return: {"status":"ok","service":"chatlockup-api"}
```

### 2. Run Migrations

Migrations run automatically on service restart via the `release` command in Procfile.

To manually trigger:
```bash
curl -X POST https://chatlockup-backend.onrender.com/health
```

### 3. Test API

**Register:**
```bash
curl -X POST https://chatlockup-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nYour-Public-Key-Here\n-----END PUBLIC KEY-----"
  }'
```

**Login:**
```bash
curl -X POST https://chatlockup-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

## Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | Yes | `production` | Set automatically |
| `PORT` | No | `3001` | Set automatically |
| `DATABASE_URL` | Yes | `postgresql://...` | From database service |
| `JWT_SECRET` | Yes | `abc123...` | Generate strong value |
| `CLIENT_URL` | Yes | `https://chatlock.vercel.app` | Your frontend URL |

## Troubleshooting

### Build Fails

**Error: Cannot find module**
- Solution: Ensure `package-lock.json` is committed to git
- Run `npm install` locally and commit lock file

**Error: Prisma schema not found**
- Solution: Ensure `prisma/schema.prisma` is in the root of `server/` directory
- Check `.gitignore` doesn't exclude Prisma files

### Database Connection Fails

**Error: ECONNREFUSED**
- Solution: Verify `DATABASE_URL` is set and reachable
- Check database is created and running in Render
- Use Internal URL for Render-to-Render communication

**Error: Authentication failed**
- Solution: Verify database user/password in connection string
- Reset PostgreSQL database password if needed

### Environment Variables Not Loaded

**JWT token verification fails**
- Solution: Verify `JWT_SECRET` is set in Render dashboard
- Restart service to reload env vars

**CORS errors on frontend**
- Solution: Verify `CLIENT_URL` is set correctly
- Must match your frontend's exact URL (including protocol)
- Restart service after changing

### Server Crashes

**Check logs:**
```
Render Dashboard → Service → Logs
```

**Common issues:**
- Missing environment variables (check logs for specific missing var)
- Database connection timeout (increase timeout in Prisma)
- Port already in use (should not happen on Render)

## Monitoring

### Logs

View real-time logs:
1. Go to Service in Render dashboard
2. Click **Logs** tab
3. Look for deployment and runtime logs

### Metrics

Enable metrics monitoring:
1. Go to Service → Settings
2. Enable external monitoring
3. Integrate with your monitoring service

### Alerting

Set up alerts for:
- Service crashes
- High error rates
- Database connection failures

## Scaling

### Free Tier Limits
- Automatically spins down after 15 minutes of inactivity
- Limited to 0.5GB RAM
- Limited database storage

### Upgrading

When ready to scale:
1. Go to Service → Plan
2. Upgrade to Pro tier
3. Benefits: Always-on, more resources, priority support

## CI/CD with GitHub

### Automatic Deployments

Render automatically deploys when you:
1. Push to your connected branch
2. Create a pull request (preview deployment)

### Configure

**Service → Settings → Source Control**
- Branch: Select production branch
- Auto-deploy: Enable automatic deployments
- Pull Request Previews: Enable preview deployments

## Security Best Practices

✓ **JWT_SECRET** - Use strong random value (32+ chars)
✓ **DATABASE_URL** - Never commit to git
✓ **CLIENT_URL** - Match exact production domain
✓ **HTTPS** - Render provides free SSL/TLS
✓ **Database Backups** - Enable in Render dashboard
✓ **Environment Secrets** - Store sensitive values as environment variables

## Useful Links

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Troubleshooting Guide](https://render.com/docs/troubleshooting)

## Support

Having issues?
1. Check [Render Status](https://status.render.com)
2. Review [Render Docs](https://render.com/docs)
3. Contact [Render Support](https://render.com/support)
