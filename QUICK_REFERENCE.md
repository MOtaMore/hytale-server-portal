# Quick Start: Session Logic Testing

## What Was Fixed

The app had issues where:
- Remote sessions would sometimes show local data
- Sessions wouldn't properly persist or clear
- The app couldn't tell if you were logged in locally or remotely

**All these issues are now fixed!**

## Quick Test (2 minutes)

### 1. Remote Login Test
```
1. Start app: npm run dev
2. Go to "Remote" tab on login screen
3. Enter remote server address: http://192.168.1.100:9999 (or your IP)
4. Login with credentials
5. Watch console for: "[MainPage] Connected to remote server"
6. Should show remote user data
```

### 2. Session Persistence Test
```
1. After remote login (test 1), close and restart app
2. Should auto-login WITHOUT showing login screen
3. Check console for: "[App] Remote session found and valid"
4. Session should persist for 24 hours
```

### 3. Logout Test
```
1. Click logout button
2. Should show login screen
3. Restart app
4. Should show login screen (session cleared)
5. localStorage.remoteSession should be null
```

## Console Logs to Look For

### ✅ Good Remote Login Flow
```
[App] Remote session found, age: 0 hours
[App] Remote session has token: true
[App] Remote session has connectionString: true
[App] Remote session valid, authenticating...
[MainPage] Remote session detected, loading remote user data
[MainPage] Connecting to remote server: http://192.168.1.100:9999
[MainPage] Connected to remote server
```

### ✅ Good Local Login Flow
```
[App] Local session found
[MainPage] Local session detected, loading local user data
```

### ✅ Good Logout Flow
```
[MainPage] Logging out from remote session
[App] No session found
App shows AuthPage
localStorage.remoteSession = null
```

## If Something Goes Wrong

### Problem: App still shows login after remote login
**Check:**
1. Open DevTools → Application → localStorage
2. Should see `remoteSession` with 4 fields: connectionString, token, userData, timestamp
3. If not there, check console for errors in RemoteLoginForm

### Problem: Remote session doesn't persist after restart
**Check:**
1. Close app completely (not just window)
2. Open DevTools before login
3. Go to Application → localStorage
4. After remote login, should see `remoteSession` stored
5. Restart browser/app - should still be there

### Problem: Can't connect to remote server
**Check:**
1. Console logs should show timeout or connection error
2. Verify remote server is running (check port 9999)
3. Try with local IP: `http://192.168.x.x:9999`
4. Make sure not blocked by firewall

## Files to Know About

- **`src/renderer/App.tsx`** - Detects session type (local/remote/none)
- **`src/renderer/pages/MainPage.tsx`** - Initializes based on session type
- **`src/renderer/components/RemoteLoginForm.tsx`** - Handles remote login
- **`SESSION_TESTING.md`** - Detailed test cases
- **`SESSION_FIXES_SUMMARY.md`** - Technical details of fixes

## One-Command Build & Test

```bash
# Build for production
npm run build

# Or run in dev mode with GPU disabled (if crashes)
npm run dev:nogpu
```

---

**Questions?** Check [SESSION_TESTING.md](SESSION_TESTING.md) for detailed test cases or [SESSION_FIXES_SUMMARY.md](SESSION_FIXES_SUMMARY.md) for technical details.
