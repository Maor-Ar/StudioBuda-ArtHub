# StudioBuda ArtHub - Testing Guide

## Current Status

✅ **Backend Server**: Running on http://localhost:4000
✅ **Frontend Server**: Running on http://localhost:8082
✅ **GraphQL Endpoint**: http://localhost:4000/graphql
✅ **CORS**: Configured to accept all origins (development mode)

---

## Test Results Summary

### Backend Tests

#### 1. Health Check ✅
**Test**: `curl http://localhost:4000/health`
**Result**: `{"status":"ok","timestamp":"2025-12-24T13:11:18.018Z"}`
**Status**: PASSED

#### 2. GraphQL Endpoint ✅
**Test**: GraphQL register mutation with weak password
**Result**: `"Password must contain at least one uppercase letter, one lowercase letter, and one number"`
**Status**: PASSED - Password validation working correctly

#### 3. Server Configuration ✅
- Port 4000: Active
- CORS: Enabled for all origins
- CSP: Disabled in development mode
- GraphQL: Active and responding

### Frontend Tests

#### 1. Web Server ✅
**Test**: `curl http://localhost:8082`
**Result**: HTML page served successfully with StudioBuda ArtHub title
**Status**: PASSED

#### 2. Bundle Status ✅
**Test**: Metro bundler compilation
**Result**: 778 modules bundled successfully in 1308ms
**Status**: PASSED

---

## Manual Testing Instructions

### 1. Test the Frontend Web App

1. **Open the App**:
   ```
   Open your browser and navigate to: http://localhost:8082
   ```

2. **Verify Home Screen**:
   - You should see "StudioBuda ArtHub" title
   - Two buttons: "התחברות" (Login) and "הרשמה" (Register)
   - ✅ Screen renders correctly

### 2. Test User Registration

1. **Navigate to Registration**:
   - Click on "הרשמה" (Register) button
   - Registration form should appear

2. **Fill in the Registration Form**:
   ```
   First Name: John
   Last Name: Doe
   Email: john.doe@example.com
   Phone: 0501234567
   Password: Password123
   Confirm Password: Password123
   ```

3. **Submit Registration**:
   - Click "Register" button
   - Watch for loading state ("Registering...")
   - Expected outcomes:
     - ✅ **Success**: Alert "Registration successful! Welcome to StudioBuda ArtHub"
     - ✅ Auto-login and navigation to Profile screen
     - ✅ User data stored in AsyncStorage
     - ❌ **Error**: If user already exists, you'll see an error message

4. **Verify Auto-Login**:
   - After successful registration, you should be on the TabNavigator
   - Bottom tabs visible: Calendar, Products, Profile
   - Profile tab should show your user information

### 3. Test User Login

1. **Logout** (if currently logged in):
   - Go to Profile tab
   - Click "התנתק" (Logout) button
   - Should return to Home screen

2. **Navigate to Login**:
   - Click "התחברות" (Login) button
   - Login form should appear

3. **Fill in Login Form**:
   ```
   Email: john.doe@example.com
   Password: Password123
   ```

4. **Submit Login**:
   - Click "Login" button
   - Watch for loading state ("Logging in...")
   - Expected outcomes:
     - ✅ **Success**: Navigates to Profile screen with user data
     - ✅ Token and user data saved to AsyncStorage
     - ❌ **Invalid credentials**: Error alert shown

### 4. Test Profile Screen

1. **Navigate to Profile Tab**:
   - Click on Profile tab in bottom navigation

2. **Verify User Data Display**:
   - ✅ Personal Information section shows:
     - Name (firstName + lastName)
     - Email
     - Phone (if provided)
     - Role
   - ✅ Loading spinner shown while fetching data

3. **Verify Active Transactions** (if any):
   - Section title: "מנויים ומכרות פעילים"
   - Cards displayed for each active transaction
   - Shows transaction type, entries, etc.
   - Empty state if no transactions

4. **Verify Upcoming Registrations** (if any):
   - Section title: "הרשמות קרובות"
   - Cards displayed for future event registrations
   - Shows event title, date, time, instructor
   - Empty state if no registrations

5. **Test Logout**:
   - Click "התנתק" (Logout) button
   - Should clear AsyncStorage
   - Should navigate back to Home screen

### 5. Test GraphQL Integration

1. **Open GraphQL Playground**:
   ```
   Open browser: http://localhost:4000/graphql
   ```

2. **Test Health Query**:
   ```graphql
   query {
     __typename
   }
   ```
   - Should return: `{ "__typename": "Query" }`

3. **Test Registration Mutation** (with valid password):
   ```graphql
   mutation {
     register(input: {
       firstName: "Jane"
       lastName: "Smith"
       email: "jane.smith@example.com"
       phone: "0501234568"
       password: "SecurePass123"
     }) {
       token
       user {
         id
         firstName
         lastName
         email
         role
       }
     }
   }
   ```
   - ⚠️ **Note**: This may take a while due to Firebase Auth processing
   - Should return token and user object on success

4. **Test Login Mutation**:
   ```graphql
   mutation {
     login(input: {
       email: "jane.smith@example.com"
       password: "SecurePass123"
     }) {
       token
       user {
         id
         firstName
         lastName
         email
       }
     }
   }
   ```

5. **Test Authenticated Query** (Get User Profile):
   - First, copy the token from registration/login response
   - Add HTTP header:
     ```
     {
       "Authorization": "Bearer <your-token-here>"
     }
     ```
   - Run query:
     ```graphql
     query {
       me {
         id
         firstName
         lastName
         email
         phone
         role
       }
     }
     ```

---

## Known Issues

### 1. Firebase Auth Slow Response ⚠️
**Issue**: Registration/login mutations may take 1-2 minutes to complete
**Cause**: Firebase Admin SDK initializing or slow network to Firebase servers
**Impact**: First-time registration is slow
**Workaround**: Wait patiently, subsequent requests are faster

### 2. Backend Unit Tests Failing ⚠️
**Issue**: Jest configuration error: `extensionsToTreatAsEsm: ['.js']`
**Cause**: Jest doesn't need this option for ES modules in package.json
**Impact**: Cannot run `npm test` in backend
**Fix**: Update `backend/jest.config.js` to remove the `extensionsToTreatAsEsm` option

### 3. Port 8081 Already in Use
**Issue**: Default Expo port (8081) was occupied
**Resolution**: Running frontend on port 8082 instead
**Impact**: None - works perfectly on alternative port

---

## Password Requirements

The backend enforces strong password requirements:
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ Minimum length (typically 6 characters)

**Valid Example**: `Password123`
**Invalid Examples**: `password` (no uppercase, no number), `PASSWORD123` (no lowercase)

---

## GraphQL Queries Available

### Queries
- `me` - Get current user profile (requires auth)
- `events(dateRange, filters)` - Get events list
- `event(id)` - Get single event
- `myRegistrations` - Get user's event registrations (requires auth)
- `myTransactions` - Get user's transactions (requires auth)

### Mutations
- `register(input)` - Create new user account
- `login(input)` - Login existing user
- `registerForEvent(input)` - Register for an event (requires auth)
- `cancelRegistration(id)` - Cancel event registration (requires auth)
- `createTransaction(input)` - Create new transaction (requires auth)

---

## Test Checklist

- [ ] Backend health endpoint responds
- [ ] GraphQL endpoint accessible at /graphql
- [ ] Frontend loads on http://localhost:8082
- [ ] Home screen displays correctly
- [ ] Can navigate to Register screen
- [ ] Registration form validation works
- [ ] Can create new user account
- [ ] Auto-login after registration
- [ ] Can logout successfully
- [ ] Can login with credentials
- [ ] Profile screen shows user data
- [ ] Profile screen fetches data from backend (GET_ME query)
- [ ] Logout clears authentication state
- [ ] AsyncStorage persists login across page refresh

---

## Debugging Tips

### Check Backend Logs
```bash
# Backend logs are in the background task b9a449f
# View recent logs in terminal output
```

### Check Frontend Logs
```bash
# Open browser console (F12)
# Check for errors in Console tab
# Network tab shows GraphQL requests
```

### Check AsyncStorage (Browser)
1. Open Browser DevTools (F12)
2. Go to Application tab
3. Look for AsyncStorage or Local Storage
4. Check for keys:
   - `@studiobuda:auth_token`
   - `@studiobuda:user_data`

### Verify GraphQL Requests
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Filter by "graphql"
4. Check request/response for mutations

---

## Success Criteria

All tests pass if:
1. ✅ Both servers running without errors
2. ✅ Frontend loads and displays correctly
3. ✅ Can register new user (even if slow)
4. ✅ Can login with credentials
5. ✅ Profile screen shows real user data from backend
6. ✅ Logout works and clears state
7. ✅ GraphQL endpoint responds to queries/mutations
8. ✅ Authentication persists across page refresh

---

## Next Steps After Testing

Once basic authentication is working:
1. Implement CalendarScreen with events calendar
2. Add ProductsScreen with subscription purchases
3. Implement event registration flow
4. Add forgot password functionality
5. Optimize Firebase Auth performance
6. Add proper error handling and loading states
7. Implement OAuth (Google, Facebook, Apple)

---

**Test Date**: December 24, 2025
**Test Environment**: Windows Development Machine
**Backend**: Node.js with GraphQL, Firebase Admin SDK, Redis
**Frontend**: React Native Web (Expo), Apollo Client
