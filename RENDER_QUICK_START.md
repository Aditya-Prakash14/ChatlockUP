# 🚀 Quick Render Deployment Checklist

## Pre-Deployment Setup

### 1. Generate Secrets
```bash
# Generate JWT_SECRET (copy this value)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Prepare Frontend URL
- Your frontend URL (example: `https://chatlock-up.vercel.app`)
- Will be used for CORS configuration

### 3. Prepare GitHub Repository
- [ ] Push all changes to GitHub
- [ ] Ensure `server/` directory is in repo root
- [ ] Commit `render.yaml`, `Procfile`, `package.json`, `package-lock.json`

## Quick Deploy on Render (5 minutes)

### Option A: Blueprint Deploy (Fastest)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repo
4. Select branch and click **Deploy**
5. Wait for services to create (2-3 minutes)

### Option B: Manual Deploy

1. **Create Web Service**
   - [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**
   - Connect GitHub repo, select `server/` as root
   - Name: `chatlockup-backend`
   - Build: `npm install`
   - Start: `npm start`

2. **Create PostgreSQL Database**
   - **New +** → **PostgreSQL**
   - Name: `chatlockup-db`
   - Region: Oregon
   - Database: `chatlockup_prod`

3. **Set Environment Variables** (in Web Service)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(your generated secret)* |
| `CLIENT_URL` | *(your frontend URL)* |
| `DATABASE_URL` | *(auto-filled from DB)* |

4. Click **Deploy**

## After Deployment

### ✅ Verify Deployment

```bash
# Health check (replace with your Render URL)
curl https://chatlockup-backend.onrender.com/

# Should return:
# {"status":"ok","service":"chatlockup-api"}
```

### 📝 Get Your Backend URL

View in Render Dashboard:
- Service → Settings → Render URL
- Example: `https://chatlockup-backend.onrender.com`

### 🔗 Update Frontend

Update your client to use the new backend URL:
- Replace `http://localhost:3001` with your Render URL
- Update WebSocket connection URL

## Troubleshooting

### Service won't start
→ Check **Logs** tab for errors
→ Verify all environment variables are set
→ Ensure database is running

### Database connection fails
→ Verify `DATABASE_URL` in environment
→ Check database status in Render dashboard
→ Restart service

### CORS errors
→ Verify `CLIENT_URL` matches frontend exactly
→ Restart service after changing env vars

### Migrations fail
→ Check database is accessible
→ Verify schema.prisma is in repo
→ Check PostgreSQL user permissions

## Important Notes

⚠️ **Free Tier** 
- Service spins down after 15 min inactivity
- Limited resources (0.5GB RAM)
- Works fine for development/testing

⚠️ **Keep SECRET Safe**
- Never commit JWT_SECRET to git
- Only store in Render dashboard
- Regenerate if accidentally exposed

⚠️ **Database Access**
- Use **Internal Database URL** for Render-to-Render communication
- Use **External Database URL** only for outside connections

## Files Created for Render

- `Procfile` - Start commands for Render
- `render.yaml` - Infrastructure as code (optional)
- `RENDER_DEPLOYMENT.md` - Full deployment guide
- `.env` - Local development only

## Next Steps

1. ✅ Commit changes to GitHub
2. ✅ Connect to Render
3. ✅ Deploy services
4. ✅ Set environment variables
5. ✅ Test health endpoint
6. ✅ Update frontend with backend URL

## Useful Render Links

- [Dashboard](https://dashboard.render.com)
- [Docs](https://render.com/docs)
- [Status](https://status.render.com)
- [Support](https://render.com/support)

---

**Estimated Time:** 5-10 minutes to deploy
**Free Tier:** Yes, includes PostgreSQL
**Support:** Render community & docs available
