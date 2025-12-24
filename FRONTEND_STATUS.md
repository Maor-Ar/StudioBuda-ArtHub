# Frontend Development Status

## 📋 Current Status

**Frontend Directory**: ❌ **DOES NOT EXIST**

The frontend has not been created yet. We need to build a React Native application.

---

## 🎯 Frontend Requirements (From Original Plan)

Based on the original requirements, the frontend should be:

### Technology Stack
- **Framework**: React Native (mainly for mobile use, with full responsiveness)
- **Calendar Component**: Strong calendar component (e.g., FullCalendar)
- **UI Library**: Material-UI or custom design
- **GraphQL Client**: Apollo Client (to connect to backend)
- **State Management**: Context API or Redux (for auth, user data)
- **Navigation**: React Navigation
- **Storage**: AsyncStorage (for auth tokens)

### Required Screens/Features

#### 1. **Home Page (Unauthenticated)**
- [ ] Landing page for unauthenticated users
- [ ] Navigation to login/register
- [ ] View active events (public)

#### 2. **Authentication Screens**
- [ ] **Login Screen**
  - Email + password login
  - OAuth login (Facebook, Google, Apple)
  - Forgot password link
- [ ] **Register Screen**
  - Form: First name, Last name, Phone, Email, Password
  - OAuth registration (Facebook, Google, Apple)
- [ ] **Forgot Password Screen**
  - Email input
  - Reset password flow
- [ ] **Reset Password Screen**
  - Token validation
  - New password input

#### 3. **Calendar Page (Like Arbox)**
- [ ] Calendar view showing future bookings
- [ ] Bottom navigation bar with:
  - Calendar/Bookings
  - Products
  - Profile
- [ ] Display upcoming events/registrations
- [ ] Ability to register for events (if eligible)
- [ ] Ability to cancel registrations

#### 4. **Profile Page**
- [ ] User details display:
  - First name, Last name
  - Email
  - Phone
- [ ] Active subscription info:
  - Subscription type
  - Remaining entries this month
- [ ] Future bookings list
  - Link/arrow to calendar page
- [ ] Logout button

#### 5. **Products Page**
- [ ] Display all available products:
  - Subscription (מנוי כניסות)
  - Punch card (כרטיסיה)
  - Trial lesson (שיעור ניסיון) - only if `hasPurchasedTrial === false`
- [ ] Each product links to Grow payment page
- [ ] After payment, redirect back to app

#### 6. **Event Registration Flow**
- [ ] Browse events (filtered by date range, max 1 month)
- [ ] View event details:
  - Title, description
  - Date, time, duration
  - Instructor
  - Event type (trial/subscription_only/paid_workshop)
  - Available spots
  - Price (if paid_workshop)
- [ ] Register for event (if eligible):
  - Check eligibility based on active transactions
  - Show error if not eligible
  - Handle trial events (require existing trial_lesson transaction)
  - Handle subscription events (check monthly entries)
  - Handle paid workshops (create transaction if needed)

#### 7. **Manager/Admin Features** (If user role is manager/admin)
- [ ] Event management:
  - Create event
  - Edit event
  - Delete event (soft delete)
- [ ] View all users
- [ ] View all transactions
- [ ] Renew/cancel subscriptions

---

## 🔌 Backend Integration Requirements

### Apollo Client Setup
- [ ] Configure Apollo Client with GraphQL endpoint
- [ ] Set up authentication headers (Bearer token)
- [ ] Handle token storage in AsyncStorage
- [ ] Handle token refresh/expiration

### GraphQL Queries Needed
- [ ] `me` - Get current user
- [ ] `events(dateRange, filters)` - Get events for date range
- [ ] `event(id)` - Get single event details
- [ ] `myRegistrations` - Get user's future registrations
- [ ] `myTransactions` - Get user's active transactions

### GraphQL Mutations Needed
- [ ] `register(input)` - User registration
- [ ] `login(input)` - Email/password login
- [ ] `loginWithOAuth(provider, token)` - OAuth login
- [ ] `forgotPassword(email)` - Request password reset
- [ ] `resetPassword(input)` - Reset password with token
- [ ] `registerForEvent(input)` - Register for event
- [ ] `cancelRegistration(id)` - Cancel registration
- [ ] `createTransaction(input)` - Create transaction (for purchases)

### Data Flow
- [ ] On login, receive:
  - User data
  - Active transactions (with renewal check)
  - `hasPurchasedTrial` flag
- [ ] Use active transactions to:
  - Filter available events
  - Show/hide trial purchase option
  - Prevent unnecessary registration requests
- [ ] Handle subscription renewal (automatic on login)

---

## 📱 Implementation Plan

### Phase 1: Project Setup
1. [ ] Initialize React Native project (Expo or CLI)
2. [ ] Install dependencies:
   - `@apollo/client`
   - `graphql`
   - `@react-native-async-storage/async-storage`
   - `react-navigation` (or Expo Router)
   - Calendar library (e.g., `react-native-calendars`)
   - UI library (Material-UI or React Native Paper)
3. [ ] Set up project structure
4. [ ] Configure Apollo Client
5. [ ] Set up environment variables

### Phase 2: Authentication
1. [ ] Create auth context/provider
2. [ ] Implement login screen
3. [ ] Implement register screen
4. [ ] Implement OAuth login (Facebook, Google, Apple)
5. [ ] Implement forgot/reset password flow
6. [ ] Set up protected routes

### Phase 3: Core Features
1. [ ] Create calendar/events screen
2. [ ] Implement event browsing
3. [ ] Implement event registration
4. [ ] Create profile screen
5. [ ] Create products screen
6. [ ] Implement navigation

### Phase 4: Advanced Features
1. [ ] Implement subscription management display
2. [ ] Add transaction history
3. [ ] Implement manager/admin features (if needed)
4. [ ] Add error handling and loading states
5. [ ] Add offline support (if needed)

### Phase 5: Polish
1. [ ] UI/UX improvements
2. [ ] Animations and transitions
3. [ ] Error messages and validation
4. [ ] Testing
5. [ ] Performance optimization

---

## 📊 Comparison: Plan vs. Current State

| Feature | Planned | Current Status | Notes |
|---------|---------|----------------|-------|
| **Project Structure** | React Native app | ❌ Not created | Need to initialize |
| **Apollo Client** | Configured | ❌ Not set up | Need to create config |
| **Authentication** | Full flow | ❌ Not implemented | Need all auth screens |
| **Calendar View** | Like Arbox | ❌ Not implemented | Need calendar component |
| **Event Registration** | Full flow | ❌ Not implemented | Need registration logic |
| **Profile Screen** | User details + subscriptions | ❌ Not implemented | Need profile UI |
| **Products Screen** | All products with Grow links | ❌ Not implemented | Need products UI |
| **Navigation** | Bottom nav bar | ❌ Not implemented | Need navigation setup |
| **Backend Integration** | GraphQL queries/mutations | ❌ Not connected | Need Apollo setup |

---

## 🚀 Next Steps

1. **Create React Native project**
   ```bash
   npx create-expo-app frontend --template blank
   # or
   npx react-native init Frontend
   ```

2. **Install core dependencies**
   ```bash
   cd frontend
   npm install @apollo/client graphql @react-native-async-storage/async-storage
   npm install @react-navigation/native @react-navigation/bottom-tabs
   npm install react-native-calendars
   ```

3. **Set up Apollo Client**
   - Create `src/config/apollo.js`
   - Configure with backend URL
   - Set up auth headers

4. **Create basic navigation structure**
   - Set up React Navigation
   - Create screen components
   - Set up bottom tab navigation

5. **Implement authentication flow**
   - Create auth context
   - Build login/register screens
   - Connect to backend GraphQL

---

## 📝 Notes

- **Backend is ready**: All GraphQL endpoints are implemented and ready to use
- **Backend URL**: Will be `http://localhost:4000/graphql` for local development
- **Production URL**: Will be the Cloud Run URL after deployment
- **CORS**: Backend CORS is configured to allow frontend origins
- **Authentication**: Backend uses Firebase Auth tokens (JWT)
- **State Management**: Consider using Context API for auth state and Apollo Client cache for data

---

## ✅ Success Criteria

Frontend is complete when:
- [ ] Users can register and login
- [ ] Users can browse events in calendar view
- [ ] Users can register for events (if eligible)
- [ ] Users can view their profile and active subscriptions
- [ ] Users can purchase products (redirect to Grow)
- [ ] All screens are responsive and work on mobile
- [ ] App connects to backend GraphQL API
- [ ] Error handling is implemented
- [ ] Loading states are shown

