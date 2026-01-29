# Session Logic Testing Guide

## Overview
This document describes how to test the local vs remote session detection and cleanup logic in the Hytale Server Portal.

## Session Flow Diagram

```
App.tsx (Session Detection)
├── Check localStorage.remoteSession
│   ├── Valid (token + connectionString + < 24h old)?
│   │   └── sessionType = 'remote'
│   └── Invalid/Expired?
│       └── Clear localStorage and check local
└── Check electron auth for local user
    ├── Found?
    │   └── sessionType = 'local'
    └── Not found?
        └── sessionType = null (show AuthPage)

MainPage.tsx (Session Initialization)
├── Props received: sessionType from App
├── If sessionType = 'remote':
│   ├── Read remoteSession from localStorage
│   ├── Create persistent Socket.io connection
│   ├── Set isRemoteSession = true
│   └── Pass remoteSocket to all components
└── If sessionType = 'local':
    ├── Load local user via window.electron.auth
    ├── Load server path via window.electron.server
    ├── Set isRemoteSession = false
    └── Use IPC for all operations
```

## Test Cases

### Test 1: Fresh App Start (No Session)
**Expectation:** Shows AuthPage for login

**Steps:**
1. Delete localStorage: `localStorage.clear()` in DevTools console
2. Close and restart app
3. Check console logs:
   - `[App] Checking authentication... remoteSession exists: false`
   - `[App] Local session found: false` (or with local user if has account)
   - `[App] No session found` → AuthPage shown

**Success Criteria:**
✅ App shows AuthPage
✅ Logs show no session found

---

### Test 2: Local Login
**Expectation:** Authenticates locally and shows MainPage with local data

**Steps:**
1. On AuthPage, switch to "Local" tab
2. Enter credentials and login
3. Check console logs:
   - `[App] Local session found`
   - `[MainPage] Local session detected, loading local user data`
   - ServerControlPanel should show local server status

**Success Criteria:**
✅ MainPage loads with local user data
✅ Server status shows local data
✅ localStorage.remoteSession should NOT exist
✅ Logs show "Local session detected"

---

### Test 3: Remote Login
**Expectation:** Authenticates to remote server and persists session

**Steps:**
1. On AuthPage, switch to "Remote" tab
2. Enter remote server address (e.g., `http://192.168.x.x:9999`)
3. Enter credentials and login
4. Check console logs:
   - `[RemoteLoginForm] Attempting connection to: http://192.168.x.x:9999`
   - `[RemoteLoginForm] Login successful`
   - `[App] Remote session found and valid, authenticating...`
   - `[MainPage] Remote session detected, loading remote user data`
   - `[MainPage] Connecting to remote server: http://192.168.x.x:9999`
   - `[MainPage] Connected to remote server`

**Verify localStorage:**
```javascript
// In DevTools console:
JSON.parse(localStorage.getItem('remoteSession'))
// Should show:
{
  connectionString: "http://192.168.x.x:9999",
  token: "jwt_token_here",
  userData: { username: "user", ... },
  timestamp: 1234567890
}
```

**Success Criteria:**
✅ MainPage loads with remote user data
✅ Remote socket is connected (console shows "Connected to remote server")
✅ localStorage.remoteSession exists with all fields
✅ Server status shows remote data

---

### Test 4: Session Persistence After Restart
**Expectation:** App remembers remote session and auto-connects

**Steps:**
1. Complete Test 3 (Remote Login)
2. Close app completely
3. Restart app
4. Check console logs:
   - `[App] Remote session found, age: 0 hours`
   - `[App] Remote session has token: true`
   - `[App] Remote session has connectionString: true`
   - `[App] Remote session valid, authenticating...`
   - MainPage should load directly without showing AuthPage

**Success Criteria:**
✅ MainPage loads immediately (no AuthPage)
✅ Remote user is logged in
✅ Socket re-connects to remote server
✅ Console shows age = 0 hours (fresh restart)

---

### Test 5: Session Expiry (24-hour limit)
**Expectation:** Sessions older than 24 hours are cleared

**Steps:**
1. Set remote session timestamp to 25 hours ago:
```javascript
// In DevTools console after remote login:
const session = JSON.parse(localStorage.getItem('remoteSession'));
session.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
localStorage.setItem('remoteSession', JSON.stringify(session));
```
2. Close and restart app
3. Check console logs:
   - `[App] Remote session found, age: 25 hours`
   - `[App] Remote session invalid/expired, clearing...`
   - Should fallback to local authentication

**Success Criteria:**
✅ Expired session is cleared
✅ App falls back to local or shows AuthPage
✅ localStorage.remoteSession should be cleared

---

### Test 6: Logout from Remote Session
**Expectation:** Clears remote session completely

**Steps:**
1. Complete Test 3 (Remote Login) or Test 4 (Session Persistence)
2. Click logout button
3. Check console logs:
   - Should show logout process
   - Check localStorage: `localStorage.getItem('remoteSession')` → should be `null`
4. App should show AuthPage
5. Restart app
6. App should show AuthPage (no auto-login)

**Success Criteria:**
✅ localStorage.remoteSession is cleared after logout
✅ AuthPage is shown
✅ Session does not persist after restart

---

### Test 7: Switch Between Local and Remote
**Expectation:** Session cleanly switches between local and remote

**Steps:**
1. Login locally (Test 2)
2. Verify local session is active
3. Logout
4. Login to remote server (Test 3)
5. Verify remote session is active
6. Check console logs:
   - Should show transition from local to remote
   - localStorage should have remoteSession (not local account info)

**Success Criteria:**
✅ Local session properly cleared before remote login
✅ Remote data is shown (not local data)
✅ Socket connects to remote server
✅ No cross-contamination between session types

---

### Test 8: Socket Reconnection
**Expectation:** Socket auto-reconnects if connection is lost

**Steps:**
1. Complete Test 3 or 4 (Remote Session)
2. Simulate connection loss (DevTools Network tab → Offline)
3. Wait a few seconds, then go back Online
4. Check console logs:
   - Should see `[MainPage] Disconnected from remote server`
   - Should see `[MainPage] Connected to remote server` (reconnected)
5. Server data should still work

**Success Criteria:**
✅ Socket disconnects when offline
✅ Socket automatically reconnects when online
✅ No manual intervention needed
✅ Data syncs after reconnection

---

### Test 9: Panel Navigation in Remote Mode
**Expectation:** Socket maintains connection when switching panels

**Steps:**
1. Complete Test 3 (Remote Login)
2. Navigate through panels: Server → Download → Files → etc.
3. Check console logs:
   - Should NOT see "Cleaning up remote socket connection"
   - Should NOT see socket disconnect between panel switches
4. Check that remote data loads correctly on each panel

**Success Criteria:**
✅ Socket remains connected during panel navigation
✅ Remote data loads on all panels
✅ No console errors about socket disconnection

---

## Console Log Debugging

### Expected Logs for Remote Login
```
[App] Checking authentication... remoteSession exists: false
[RemoteLoginForm] Attempting connection to: http://192.168.x.x:9999
[RemoteLoginForm] Login successful
[App] Remote session found, age: 0 hours
[App] Remote session has token: true
[App] Remote session has connectionString: true
[App] Remote session valid, authenticating...
[MainPage] Remote session detected, loading remote user data
[MainPage] Connecting to remote server: http://192.168.x.x:9999
[MainPage] Setting up socket listeners
[MainPage] Socket connected, fetching status
[ServerControlPanel] Setting up socket listeners
[ServerControlPanel] Status changed: { status: 'running', ... }
```

### Expected Logs for Local Login
```
[App] Checking authentication... remoteSession exists: false
[App] Local session found
[MainPage] Local session detected, loading local user data
[ServerControlPanel] Setting up local listeners
[ServerControlPanel] Status changed: { status: 'running', ... }
```

### Expected Logs for Logout
```
Logout clicked
[MainPage] Cleaning up remote socket connection (if remote)
localStorage.remoteSession should be null after logout
App navigates to AuthPage
```

---

## Troubleshooting

### Symptom: App shows local data despite remote login
**Possible Causes:**
- `isRemoteSession` not set to true
- Components not receiving `remoteSocket` prop
- Socket listeners not properly configured

**Debug Steps:**
1. Check console for `[MainPage] Remote session detected`
2. Verify `localStorage.remoteSession` exists and is valid
3. Check if socket is connected: `[MainPage] Connected to remote server`
4. Verify components have `isRemoteMode={isRemoteSession}` and `remoteSocket={remoteSocket}`

---

### Symptom: Remote session doesn't persist after restart
**Possible Causes:**
- localStorage not being saved
- Session timestamp is too old
- localStorage data is corrupted

**Debug Steps:**
1. After remote login, check: `JSON.parse(localStorage.getItem('remoteSession'))`
2. Verify all 4 fields exist: `connectionString`, `token`, `userData`, `timestamp`
3. Check session age: `Math.round((Date.now() - timestamp) / (60 * 60 * 1000))` (should be < 24)
4. Look for errors in console: `[App] Invalid remote session:`

---

### Symptom: Socket disconnects when switching panels
**Possible Causes:**
- Socket created at component level instead of page level
- Cleanup function disconnecting socket too early

**Debug Steps:**
1. Check socket should be created in MainPage, not components
2. Look for: `[MainPage] Cleaning up remote socket connection` in console
3. Should only see it when MainPage unmounts, not during panel switch
4. Verify socket remains in state: inspect React DevTools or check `remoteSocket` in console

---

## localStorage Structure

### Remote Session
```javascript
{
  connectionString: "http://192.168.x.x:9999",  // URL of remote server
  token: "eyJhbGc...",                           // JWT auth token
  userData: {                                     // User info from server
    username: "user@example.com",
    id: "user123",
    // ... other user fields
  },
  timestamp: 1704067200000                       // When session was created (ms)
}
```

### Local Session
- Handled by Electron `window.electron.auth`
- No localStorage entry for local session
- Persisted in secure storage by Electron

---

## Performance Checklist

After making session logic changes, verify:
- ✅ App starts quickly (no delays checking sessions)
- ✅ Remote login completes in < 5 seconds
- ✅ Panel navigation is smooth (no socket reconnects)
- ✅ Logout completes immediately
- ✅ No memory leaks (socket properly cleaned up)
- ✅ No console errors during normal operation
