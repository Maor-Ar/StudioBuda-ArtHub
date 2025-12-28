# StudioBuda ArtHub - Frontend Development Plan

## Overview

The StudioBuda ArtHub frontend is a React Native mobile application built with Expo that enables users to browse art studio classes, register for sessions, manage subscriptions/punch cards, and handle bookings. The app connects to a GraphQL backend API for all data operations.

## Technology Stack

- **Framework**: React Native (0.73.0)
- **Development Platform**: Expo (~50.0.0)
- **State Management**: React Context API + Apollo Client Cache
- **GraphQL Client**: Apollo Client (^3.8.0)
- **Navigation**: React Navigation (v6)
  - Stack Navigator
  - Bottom Tab Navigator
- **Authentication**: Firebase Auth (via React Native Firebase)
- **Local Storage**: AsyncStorage
- **Calendar**: react-native-calendars (^1.1301.0)
- **OAuth**: expo-auth-session, expo-web-browser

## Architecture Overview

### Application Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── main/           # Main app screens
│   │   └── admin/          # Admin/Manager screens (future)
│   ├── navigation/         # Navigation configuration
│   ├── context/            # React Context providers
│   ├── services/           # API and service integrations
│   │   ├── apolloClient.js
│   │   ├── authService.js
│   │   └── graphql/        # GraphQL queries and mutations
│   └── utils/              # Utility functions and constants
├── app.json                # Expo configuration
└── package.json
```

### Key Design Principles

1. **Component-Based Architecture**: Reusable components for consistency
2. **Context for Global State**: AuthContext for authentication state
3. **Apollo Client for Server State**: Automatic caching and refetching
4. **Navigation-Based Routing**: Stack and Tab navigators for different user flows
5. **Offline-First Considerations**: AsyncStorage for persistence, Apollo cache for offline reads

## Navigation Structure

### Navigation Hierarchy

```
AppNavigator (Root)
├── AuthNavigator (Unauthenticated users)
│   ├── HomeScreen (Landing/Welcome)
│   ├── LoginScreen
│   └── RegisterScreen
│
└── TabNavigator (Authenticated users)
    ├── CalendarScreen (Main events calendar)
    ├── ProductsScreen (Subscriptions/Punch Cards)
    └── ProfileScreen (User profile & bookings)
    
    └── AdminNavigator (Manager/Admin only)
        ├── EventManagementScreen (Create/Edit events)
        ├── TransactionsScreen (View all transactions)
        └── UsersScreen (View all users)
```

## Feature Breakdown

### 1. Authentication Flow

#### Screens Required
- ✅ `HomeScreen.js` - Landing page with login/register options
- ✅ `LoginScreen.js` - Email/password login + OAuth options
- ✅ `RegisterScreen.js` - User registration form

#### Features
- **Email/Password Authentication**
  - Registration form (firstName, lastName, phone, email, password)
  - Login form (email, password)
  - Password validation (display requirements)
  - Error handling and display

- **OAuth Authentication**
  - Facebook login
  - Google login
  - Apple login (iOS only)
  - Handle OAuth callbacks
  - Extract user info from OAuth providers

- **Password Recovery**
  - Forgot password flow
  - Reset password screen (with token from email link)
  - Email verification feedback

#### Context/State
- ✅ `AuthContext.js` - Manages auth state, token storage, user data
- `authService.js` - Handles Firebase Auth integration

#### GraphQL Operations
- ✅ `REGISTER` mutation
- ✅ `LOGIN` mutation
- ✅ `LOGIN_WITH_OAUTH` mutation
- ✅ `FORGOT_PASSWORD` mutation
- ✅ `RESET_PASSWORD` mutation

### 2. Calendar/Events Screen

#### Screen Required
- ✅ `CalendarScreen.js` - Main calendar view with events

#### Features
- **Calendar Display**
  - Monthly calendar view (react-native-calendars)
  - Highlight dates with events
  - Show event count badges on dates
  - Navigate between months

- **Event List View**
  - Filter events by selected date
  - Display events for selected date range (up to 1 month)
  - Show event details: title, time, instructor, available spots, type
  - Visual indicators for event types (trial, subscription_only, paid_workshop)
  - Recurring event indicators

- **Event Details & Registration**
  - Event detail modal/screen
  - Registration button (with eligibility checks)
  - Display user's eligibility based on transactions
  - Show "Already Registered" state
  - Show "Full" state when no spots available
  - Show "Requires Subscription" state
  - Show "Requires Trial Purchase" state

- **Event Filtering**
  - Filter by event type (trial, subscription_only, paid_workshop)
  - Filter by instructor
  - Show only available events

#### Components Needed
- ✅ `EventCard.js` - Event display card (needs enhancement)
- `EventDetailModal.js` - Event detail modal/sheet
- `CalendarEventDot.js` - Calendar date marker
- `EventFilterBar.js` - Filter controls

#### GraphQL Operations
- ✅ `GET_EVENTS` query (with dateRange and filters)
- ✅ `GET_EVENT` query
- ✅ `REGISTER_FOR_EVENT` mutation
- ✅ `CANCEL_REGISTRATION` mutation

#### Business Logic
- Check user's active transactions before showing registration button
- For trial events: Check if user has active trial_lesson transaction
- For subscription_only: Check if user has active subscription with available entries
- For paid_workshop: Allow registration with transaction creation
- Handle recurring event instances (backend generates on-the-fly)

### 3. Products Screen

#### Screen Required
- ✅ `ProductsScreen.js` - Subscriptions and punch cards

#### Features
- **Product Display**
  - List available subscriptions
  - List available punch cards
  - Display pricing and details
  - Show trial lesson option (if user hasn't purchased)

- **User's Active Transactions**
  - Display active subscriptions with:
    - Monthly entries count
    - Entries used this month
    - Renewal date
    - Status (active/inactive)
  - Display active punch cards with:
    - Total entries
    - Remaining entries
    - Expiration (if applicable)
  - Display trial lesson status (if purchased)

- **Purchase Flow**
  - Initiate purchase for subscriptions
  - Initiate purchase for punch cards
  - Initiate purchase for trial lesson
  - Integration with Grow payment system (via backend)
  - Payment confirmation handling

#### Components Needed
- ✅ `ProductCard.js` - Product display card (needs enhancement)
- `TransactionCard.js` - Active transaction display
- `PurchaseModal.js` - Purchase confirmation modal
- `SubscriptionStatusCard.js` - Subscription details card
- `PunchCardStatusCard.js` - Punch card details card

#### GraphQL Operations
- ✅ `GET_MY_TRANSACTIONS` query
- ✅ `CREATE_TRANSACTION` mutation
- Note: Product catalog may be hardcoded or fetched from backend (TBD)

### 4. Profile Screen

#### Screen Required
- ✅ `ProfileScreen.js` - User profile and bookings

#### Features
- **User Profile**
  - Display user information (name, email, phone)
  - Edit profile functionality
  - Profile picture (future enhancement)
  - Account settings

- **My Bookings**
  - List of future registrations
  - Event details (title, date, time, instructor)
  - Cancel registration option
  - Past bookings section (optional)

- **Transaction History**
  - List all user's transactions (active and inactive)
  - Transaction details and status
  - Payment history

- **Account Actions**
  - Logout button
  - Delete account (future)
  - Change password (if email user)
  - Privacy settings

#### Components Needed
- ✅ `BookingCard.js` - Booking display card (needs enhancement)
- `ProfileHeader.js` - Profile section header
- `BookingList.js` - List of bookings
- `TransactionHistoryItem.js` - Transaction history item

#### GraphQL Operations
- ✅ `GET_ME` query
- ✅ `GET_MY_REGISTRATIONS` query
- ✅ `GET_MY_TRANSACTIONS` query
- ✅ `CANCEL_REGISTRATION` mutation
- `UPDATE_USER` mutation (if available)

### 5. Admin/Manager Screens (Future)

#### Screens Required
- `EventManagementScreen.js` - Create/edit/delete events
- `TransactionsScreen.js` - View all transactions
- `UsersScreen.js` - View all users
- `DashboardScreen.js` - Admin dashboard

#### Features (Manager/Admin Only)
- Event CRUD operations
- View all user transactions
- Manage subscriptions (renew/cancel)
- View all users
- Analytics/statistics (future)

#### Navigation
- ✅ `AdminNavigator.js` - Admin section navigation (structure exists)

#### GraphQL Operations
- ✅ `CREATE_EVENT` mutation
- ✅ `UPDATE_EVENT` mutation
- ✅ `DELETE_EVENT` mutation
- ✅ `GET_ALL_TRANSACTIONS` query
- ✅ `GET_ALL_USERS` query
- ✅ `RENEW_SUBSCRIPTION` mutation
- ✅ `CANCEL_SUBSCRIPTION` mutation

## Component Library

### Existing Components (Need Review/Enhancement)
- ✅ `EventCard.js` - Display event information
- ✅ `BookingCard.js` - Display booking information
- ✅ `ProductCard.js` - Display product information

### Additional Components Needed

#### UI Components
- `Button.js` - Standardized button component
- `Input.js` - Standardized text input component
- `LoadingSpinner.js` - Loading indicator
- `ErrorMessage.js` - Error message display
- `EmptyState.js` - Empty state placeholder
- `Modal.js` - Reusable modal component
- `DatePicker.js` - Date picker component
- `TimePicker.js` - Time picker component

#### Feature-Specific Components
- `EventDetailModal.js` - Event details modal
- `RegistrationConfirmation.js` - Registration success/confirmation
- `TransactionCard.js` - Transaction display card
- `FilterBar.js` - Event filter controls
- `CalendarEventMarker.js` - Calendar date event markers

#### Layout Components
- `ScreenContainer.js` - Standard screen wrapper
- `Header.js` - Screen header component
- `TabBar.js` - Custom tab bar (if needed)

## State Management Strategy

### Global State (Context API)

1. **AuthContext** ✅
   - User data
   - Authentication token
   - Login/logout functions
   - Loading state

2. **TransactionsContext** (Optional)
   - Active transactions (could use Apollo cache instead)
   - Transaction refresh trigger

### Server State (Apollo Client)

- All GraphQL queries cached automatically
- Cache policies configured per query:
  - Events: Cache for 15 minutes, refetch on focus
  - User data: Cache for 1 hour
  - Transactions: Cache for 5 minutes
  - Registrations: Cache for 10 minutes

### Local State (Component State)

- Form inputs
- UI state (modals, filters, selections)
- Temporary display state

### Persisted State (AsyncStorage)

- Authentication token
- User data (for offline access)
- User preferences (theme, language, etc.)

## User Flows

### 1. New User Registration Flow

```
HomeScreen
  → RegisterScreen (fill form)
    → Registration API call
      → Success: Login automatically → TabNavigator
      → Error: Show error message
```

### 2. Login Flow

```
HomeScreen
  → LoginScreen
    → Email/Password login OR OAuth
      → Success: Store token → TabNavigator
      → Error: Show error message
```

### 3. Browse and Register for Event Flow

```
CalendarScreen
  → Select date on calendar
    → Events for date displayed
      → Tap event → EventDetailModal
        → Check eligibility
          → Eligible: Show "Register" button
          → Not eligible: Show reason + "Purchase" button
        → Register button
          → Confirm registration
            → Success: Show confirmation, refresh calendar
            → Error: Show error message
```

### 4. Purchase Product Flow

```
ProductsScreen
  → View products
    → Tap product → PurchaseModal
      → Confirm purchase
        → Redirect to payment (Grow integration)
          → Payment success → Create transaction
            → Success: Show confirmation, refresh transactions
            → Error: Show error message
```

### 5. Manage Bookings Flow

```
ProfileScreen
  → My Bookings section
    → View future registrations
      → Tap booking → Booking details
        → Cancel registration button
          → Confirm cancellation
            → Success: Remove from list, refresh
            → Error: Show error message
```

## API Integration

### Apollo Client Configuration

- ✅ Configured in `apolloClient.js`
- Authentication header: Bearer token from AuthContext
- Error handling: Network errors, GraphQL errors
- Cache configuration: In-memory cache with persistence options

### GraphQL Query/Mutation Patterns

1. **Queries with Variables**
   ```javascript
   const { data, loading, error, refetch } = useQuery(GET_EVENTS, {
     variables: { dateRange: { startDate, endDate } },
     skip: !dateRange,
   });
   ```

2. **Mutations with Optimistic Updates**
   ```javascript
   const [registerForEvent] = useMutation(REGISTER_FOR_EVENT, {
     refetchQueries: [{ query: GET_MY_REGISTRATIONS }],
     awaitRefetchQueries: true,
   });
   ```

3. **Error Handling**
   - Display user-friendly error messages
   - Handle network errors
   - Handle GraphQL errors with error codes

### API Endpoints

- GraphQL endpoint: `http://localhost:4000/graphql` (development)
- Production endpoint: TBD (configure via environment)

## Styling Approach

### Options to Consider

1. **StyleSheet API** (React Native default)
   - Pros: Native performance, no dependencies
   - Cons: Limited styling capabilities

2. **Styled Components** (react-native-styled-components)
   - Pros: Component-scoped styles, theme support
   - Cons: Additional dependency, performance overhead

3. **TailwindCSS Native** (nativewind)
   - Pros: Utility-first, rapid development
   - Cons: Additional setup, build configuration

### Recommended: StyleSheet + Theme System

- Create a `theme.js` file with:
  - Colors (primary, secondary, error, success, etc.)
  - Typography (font sizes, weights)
  - Spacing (margins, paddings)
  - Component styles (buttons, cards, inputs)

- Use consistent spacing scale (4, 8, 12, 16, 24, 32)
- Use semantic color names
- Support dark mode (future)

## Error Handling Strategy

### Error Types

1. **Network Errors**
   - Show "Connection error" message
   - Retry mechanism
   - Offline indicator

2. **GraphQL Errors**
   - Parse error code from response
   - Display user-friendly messages
   - Handle specific error codes:
     - `AUTHENTICATION_ERROR`: Redirect to login
     - `AUTHORIZATION_ERROR`: Show permission denied
     - `VALIDATION_ERROR`: Show field-specific errors
     - `CONFLICT_ERROR`: Show conflict message (e.g., already registered)

3. **Form Validation Errors**
   - Inline field errors
   - Disable submit until valid
   - Clear error messages on input change

### Error Display Components

- Toast notifications for temporary errors
- Inline error messages for form fields
- Full-screen error states for critical failures

## Loading States

- Global loading spinner during initial app load
- Skeleton screens for content loading
- Pull-to-refresh on list screens
- Optimistic UI updates for mutations
- Loading indicators on buttons during actions

## Testing Strategy

### Unit Testing
- Component testing (React Native Testing Library)
- Utility function testing
- Context testing

### Integration Testing
- Navigation flow testing
- API integration testing (mocked)
- Form submission testing

### E2E Testing (Future)
- Detox for E2E tests
- Critical user flows
- Authentication flows

## Security Considerations

1. **Token Storage**
   - Store Firebase ID token securely in AsyncStorage
   - Refresh token before expiration
   - Clear token on logout

2. **API Security**
   - Include token in all authenticated requests
   - Handle token expiration (redirect to login)
   - Never log tokens in console (production)

3. **Input Validation**
   - Client-side validation before API calls
   - Sanitize user inputs
   - Validate email formats, phone numbers

4. **OAuth Security**
   - Use secure OAuth flow
   - Validate OAuth tokens on backend
   - Handle OAuth errors gracefully

## Performance Optimization

1. **Image Optimization**
   - Use optimized image formats (WebP)
   - Lazy load images
   - Cache images locally

2. **List Optimization**
   - Use FlatList with proper keys
   - Implement pagination if needed (current limit: 1 month of events)
   - Virtualize long lists

3. **Query Optimization**
   - Use Apollo cache effectively
   - Batch queries when possible
   - Use fetchPolicy appropriately (cache-first vs network-only)

4. **Bundle Size**
   - Code splitting (if using web)
   - Remove unused dependencies
   - Optimize imports

## Implementation Phases

### Phase 1: Core Authentication ✅ (Partially Complete)
- [x] AuthContext setup
- [x] Basic navigation structure
- [x] Login/Register screens structure
- [ ] Complete login implementation
- [ ] Complete registration implementation
- [ ] OAuth integration
- [ ] Password recovery flow
- [ ] Error handling and validation

### Phase 2: Events & Calendar (In Progress)
- [x] CalendarScreen structure
- [x] Basic GraphQL queries
- [ ] Calendar component integration
- [ ] Event list display
- [ ] Event detail modal
- [ ] Event filtering
- [ ] Registration flow
- [ ] Cancel registration flow
- [ ] Eligibility checks and UI feedback

### Phase 3: Products & Transactions
- [x] ProductsScreen structure
- [x] Basic transaction queries
- [ ] Product catalog display
- [ ] Active transactions display
- [ ] Purchase flow
- [ ] Payment integration (Grow)
- [ ] Transaction history

### Phase 4: Profile & Bookings
- [x] ProfileScreen structure
- [x] BookingCard component
- [ ] User profile display
- [ ] Edit profile functionality
- [ ] Bookings list
- [ ] Cancel booking flow
- [ ] Transaction history in profile

### Phase 5: UI/UX Polish
- [ ] Component library standardization
- [ ] Theme implementation
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Animations and transitions
- [ ] Accessibility improvements

### Phase 6: Admin Features (Future)
- [ ] Admin navigation
- [ ] Event management screens
- [ ] Transaction management
- [ ] User management
- [ ] Admin dashboard

### Phase 7: Advanced Features (Future)
- [ ] Push notifications
- [ ] Offline mode
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Analytics integration
- [ ] Deep linking

## Environment Configuration

### Development
- GraphQL endpoint: `http://localhost:4000/graphql`
- Firebase config: Development project
- Enable debug logging

### Production
- GraphQL endpoint: TBD (production URL)
- Firebase config: Production project
- Disable debug logging
- Error tracking (Sentry, etc.)

## Dependencies Status

### Current Dependencies ✅
- Expo, React Native - Core framework
- Apollo Client, GraphQL - API client
- React Navigation - Navigation
- Firebase Auth - Authentication
- react-native-calendars - Calendar component
- AsyncStorage - Local storage

### Potential Additional Dependencies
- Form validation library (formik, react-hook-form)
- Date manipulation (date-fns, moment)
- Icons (expo-icons, react-native-vector-icons)
- Error tracking (Sentry)
- Analytics (Firebase Analytics, Mixpanel)

## Known Limitations & Considerations

1. **Date Range Limit**: Events query limited to 1 month (31 days) - UI should enforce this
2. **Recurring Events**: Backend generates instances on-the-fly - Frontend should handle computed IDs
3. **Trial Lesson**: Can only purchase once - UI should hide option if `hasPurchasedTrial` is true
4. **Subscription Renewal**: Backend handles on login - Frontend should display updated entry counts
5. **Offline Support**: Limited - Apollo cache provides some offline reads, but mutations require network

## Next Steps

1. **Review existing code** - Assess current implementation status
2. **Complete authentication flow** - Finish login/register/OAuth
3. **Enhance CalendarScreen** - Implement full calendar and event display
4. **Build component library** - Create standardized UI components
5. **Implement event registration** - Complete registration flow with eligibility checks
6. **Add error handling** - Implement comprehensive error handling
7. **Style and theme** - Create consistent styling system

## Documentation Maintenance

**Rule**: After every major feature implementation, update this plan to reflect:
- Completed features
- New components created
- Architecture decisions made
- Known issues or limitations discovered

This document serves as the roadmap and reference for frontend development.








