# 🚀 Deployment Checklist - ETMS Backend

Use this checklist before deploying the fixed backend to production.

---

## ✅ Pre-Deployment Checklist

### 1. Local Testing
- [ ] Server starts without errors: `npm run dev`
- [ ] TypeScript compiles: `npm run typecheck` (should show 0 errors)
- [ ] Health check works: `curl http://localhost:5000/health`
- [ ] Login/logout works
- [ ] Ticket creation with file upload works
- [ ] Asset transfer validation works
- [ ] All CRUD operations tested

### 2. Security Review
- [ ] `.env` file is NOT in git repository
- [ ] `.env` removed from git history (if previously committed)
  ```bash
  git rm --cached etms-mvp/server/.env
  git commit -m "Remove .env from version control"
  ```
- [ ] `.gitignore` includes `.env` and sensitive files
- [ ] Strong JWT_SECRET generated (32+ characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Database credentials are secure
- [ ] No hardcoded passwords in code

### 3. Environment Configuration
- [ ] Production `.env` file created on server
- [ ] All required variables set:
  - [ ] `DB_HOST`
  - [ ] `DB_PORT`
  - [ ] `DB_NAME`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `JWT_SECRET` (production value)
  - [ ] `CLIENT_URL` (production frontend URL)
  - [ ] `UPLOAD_DIR`
  - [ ] `RESPONSE_UPLOAD_DIR`
  - [ ] `SLA_CRON_SCHEDULE`
- [ ] SMTP configured (if using email)
  - [ ] `SMTP_HOST`
  - [ ] `SMTP_PORT`
  - [ ] `SMTP_USER`
  - [ ] `SMTP_PASS`
  - [ ] `MAIL_FROM`

### 4. Database
- [ ] Production database created
- [ ] Database migrations run
- [ ] Database user has correct permissions
- [ ] Database connection tested
- [ ] Backup strategy in place

### 5. File System
- [ ] Upload directories exist and have correct permissions
  ```bash
  mkdir -p uploads/responses
  chmod 755 uploads
  chmod 755 uploads/responses
  ```
- [ ] Disk space sufficient for uploads
- [ ] Backup strategy for uploads folder

### 6. Build & Deploy
- [ ] Code built successfully: `npm run build`
- [ ] `dist/` folder contains compiled code
- [ ] Node.js version matches (check `package.json` engines)
- [ ] Dependencies installed: `npm ci` (production)
- [ ] PM2 or process manager configured (if using)

### 7. Network & Infrastructure
- [ ] Firewall rules configured
- [ ] Port 5000 (or configured PORT) accessible
- [ ] CORS configured for production domain
- [ ] SSL/TLS certificates installed
- [ ] Reverse proxy configured (nginx/Apache)
- [ ] Load balancer configured (if applicable)

### 8. Monitoring & Logging
- [ ] Health check endpoint accessible: `/health`
- [ ] Monitoring tool configured (Datadog, New Relic, etc.)
- [ ] Log aggregation set up (CloudWatch, ELK, etc.)
- [ ] Alerts configured for:
  - [ ] Server down
  - [ ] High error rate
  - [ ] Database connection failures
  - [ ] Disk space low

### 9. Performance
- [ ] Database indexes created (check schema)
- [ ] Connection pooling configured
- [ ] Rate limiting considered (future enhancement)
- [ ] Caching strategy (if applicable)

### 10. Documentation
- [ ] README updated with new environment variables
- [ ] API documentation current
- [ ] Deployment runbook created
- [ ] Team notified of changes

---

## 🧪 Post-Deployment Testing

After deployment, verify:

### Smoke Tests
```bash
# 1. Health check
curl https://your-domain.com/health

# 2. Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 3. Get current user (with token from login)
curl https://your-domain.com/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Functional Tests
- [ ] User can login
- [ ] User can create ticket
- [ ] User can upload file
- [ ] Manager can approve ticket
- [ ] Employee can update ticket status
- [ ] Asset transfer works
- [ ] Email notifications sent (if configured)

### Performance Tests
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] Database queries optimized
- [ ] File uploads complete successfully

---

## 🔄 Rollback Plan

If issues occur:

### Quick Rollback
```bash
# 1. Stop the new version
pm2 stop etms-server

# 2. Start the previous version
pm2 start etms-server-old

# 3. Verify health
curl http://localhost:5000/health
```

### Database Rollback
- [ ] Database backup available
- [ ] Rollback script tested
- [ ] Data migration reversible

---

## 📊 Monitoring Checklist

After deployment, monitor for 24-48 hours:

### Metrics to Watch
- [ ] Server uptime
- [ ] Response times
- [ ] Error rates
- [ ] Database connection pool
- [ ] Memory usage
- [ ] CPU usage
- [ ] Disk space
- [ ] Upload folder size

### Logs to Review
- [ ] Application logs
- [ ] Error logs
- [ ] Database logs
- [ ] Web server logs (nginx/Apache)

---

## 🚨 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | | |
| Database Admin | | |
| Backend Lead | | |
| On-Call Engineer | | |

---

## 📝 Deployment Notes

### Deployment Date: _______________
### Deployed By: _______________
### Version/Commit: _______________

### Issues Encountered:
```
(Document any issues during deployment)
```

### Resolution:
```
(Document how issues were resolved)
```

---

## ✅ Sign-Off

- [ ] Development Team Lead: _______________
- [ ] QA Lead: _______________
- [ ] DevOps Lead: _______________
- [ ] Product Owner: _______________

---

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All smoke tests pass
- ✅ No critical errors in logs
- ✅ Health check returns 200
- ✅ Users can login and use the system
- ✅ File uploads work
- ✅ Email notifications sent (if configured)
- ✅ Performance metrics within acceptable range
- ✅ No rollback required after 24 hours

---

## 📚 Additional Resources

- [BACKEND_FIXES_APPLIED.md](./BACKEND_FIXES_APPLIED.md) - Details of all fixes
- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - How to start and test
- [FIXES_SUMMARY.md](./FIXES_SUMMARY.md) - Quick reference

---

**Last Updated:** April 22, 2026  
**Version:** 1.0 (Post-Fixes)

---

*Use this checklist for every deployment to ensure consistency and reliability.*
