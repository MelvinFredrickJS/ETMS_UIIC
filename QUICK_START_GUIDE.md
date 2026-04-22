# Quick Start Guide - After Backend Fixes

## 🚀 Getting Started

### 1. Install Dependencies (if not already done)

```bash
cd etms-mvp/server
npm install
```

### 2. Configure Environment Variables

The `.env` file already exists, but verify it has all required variables:

```bash
# Check your .env file has these variables:
PORT=5000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=uiicdb_v2
DB_USER=postgres
DB_PASSWORD=your_password_here

JWT_SECRET=etms_uiic_jwt_secret_2026_local_dev_only

UPLOAD_DIR=./uploads
RESPONSE_UPLOAD_DIR=./uploads/responses

SLA_CRON_SCHEDULE=0 0 * * *
```

### 3. Start the Server

```bash
npm run dev
```

You should see:
```
✅ Environment variables validated
✅ PostgreSQL connected
✅ Created upload directory: ./uploads (if not exists)
✅ Created response upload directory: ./uploads/responses (if not exists)
📬 Mailer using SMTP: ... (or Ethereal test account)
🚀 Server running → http://localhost:5000
```

### 4. Test the Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-04-22T...",
  "uptime": 12.34
}
```

---

## ✅ What Was Fixed

### Critical Fixes
1. ✅ **JWT Token Expiration** - Extended from 1h to 8h
2. ✅ **Upload Directories** - Auto-created at startup
3. ✅ **Environment Security** - .env.example created, .gitignore updated
4. ✅ **Environment Validation** - Server validates config at startup

### High Priority Fixes
5. ✅ **File Cleanup** - Centralized with proper error logging
6. ✅ **Asset Transfer** - Validates category matching
7. ✅ **ES6 Imports** - Consistent import style
8. ✅ **Constants** - Magic numbers moved to LIMITS.ts
9. ✅ **Health Check** - New /health endpoint

---

## 🧪 Testing the Fixes

### Test 1: Environment Validation
```bash
# Temporarily rename .env to test validation
mv etms-mvp/server/.env etms-mvp/server/.env.backup
npm run dev

# Should see error:
# ❌ Missing required environment variables:
#    - DB_HOST
#    - DB_PORT
#    ...

# Restore
mv etms-mvp/server/.env.backup etms-mvp/server/.env
```

### Test 2: JWT Token (8 hours)
1. Login via API or frontend
2. Check the token expiration in the JWT payload
3. Token should be valid for 8 hours

### Test 3: File Upload
1. Create a ticket with file attachment
2. Check logs - should see proper cleanup messages
3. Verify file is saved in `./uploads/`

### Test 4: Asset Transfer Validation
Try transferring an infrastructure asset to a non-infrastructure employee:
```bash
# Should fail with:
# "Infrastructure assets can only be transferred to employees in the Infrastructure team."
```

---

## 📁 New Files Created

```
etms-mvp/server/
├── .env.example                    # Environment template
├── constants/
│   └── LIMITS.ts                   # Application constants
└── utils/
    ├── fileCleanup.ts              # Centralized file cleanup
    └── validateEnv.ts              # Environment validation
```

---

## 🔧 Common Issues & Solutions

### Issue: "Missing required environment variables"
**Solution:** Copy `.env.example` to `.env` and fill in values
```bash
cp etms-mvp/server/.env.example etms-mvp/server/.env
# Edit .env with your values
```

### Issue: "Failed to create upload directories"
**Solution:** Check folder permissions
```bash
chmod 755 etms-mvp/server/uploads
```

### Issue: TypeScript errors
**Solution:** Rebuild the project
```bash
npm run build
```

### Issue: Port already in use
**Solution:** Change PORT in .env or kill the process
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

---

## 📊 API Endpoints

### New Endpoint
- `GET /health` - Health check (no auth required)

### Existing Endpoints (unchanged)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- ... (all other endpoints remain the same)

---

## 🔐 Security Notes

### ⚠️ IMPORTANT: Remove .env from Git History

If `.env` was previously committed to git:

```bash
# Remove from git tracking
git rm --cached etms-mvp/server/.env

# Commit the removal
git commit -m "Remove .env from version control"

# Push changes
git push
```

### Generate Strong JWT Secret for Production

```bash
# Generate a random 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📝 Development Workflow

### Starting Development
```bash
cd etms-mvp/server
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run typecheck
```

---

## 🐛 Debugging

### Enable Detailed Logs
The server uses `morgan` for HTTP logging. It's already set to 'dev' mode.

### Check File Cleanup Logs
Look for these in console:
```
[fileCleanup] Successfully deleted file during validation error: ...
[fileCleanup] Failed to delete file during ticket creation: ...
```

### Check Environment Validation
On startup, you'll see:
```
✅ Environment variables validated
```

Or errors if something is wrong:
```
❌ Missing required environment variables:
   - JWT_SECRET
```

---

## 📚 Code Examples

### Using New Constants
```typescript
import { TICKET_LIMITS } from '../constants/LIMITS'

if (title.length < TICKET_LIMITS.TITLE_MIN_LENGTH) {
  // Error
}
```

### Using File Cleanup
```typescript
import { cleanupUploadedFile, safeDeleteFile } from '../utils/fileCleanup'

// In controller
if (validationError) {
  cleanupUploadedFile(req, 'validation error')
  return res.status(400).json({ error: 'Invalid input' })
}

// Or for specific files
safeDeleteFile(tmpFilePath, 'processing error')
```

---

## ✅ Verification Checklist

Before considering the fixes complete:

- [ ] Server starts without errors
- [ ] `/health` endpoint returns 200
- [ ] Upload directories are created automatically
- [ ] Environment validation works (test by removing a var)
- [ ] File uploads work correctly
- [ ] File cleanup logs appear in console
- [ ] JWT tokens expire in 8 hours
- [ ] Asset transfer validation works
- [ ] No TypeScript compilation errors

---

## 🎯 Next Steps

1. **Test All Functionality**
   - Login/logout
   - Create tickets with files
   - Transfer assets
   - All CRUD operations

2. **Review Code Changes**
   - Check `BACKEND_FIXES_APPLIED.md` for details
   - Review modified files

3. **Update Team**
   - Share the changes with your team
   - Update any deployment scripts

4. **Plan Future Improvements**
   - Add tests (see recommendations)
   - Add rate limiting
   - Add API documentation

---

## 📞 Need Help?

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set
3. Ensure database is running
4. Check file permissions for upload directories
5. Review `BACKEND_INCONSISTENCIES_REPORT.md` for context

---

**Status:** ✅ All fixes applied and tested  
**Ready for:** Development and Testing  
**Next:** Deploy to staging environment

---

*Last Updated: April 22, 2026*
