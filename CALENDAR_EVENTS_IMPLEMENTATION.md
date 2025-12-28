# Calendar Events Implementation Summary

## Overview
Successfully connected the events table to the Calendar screen, enabling real-time display of weekly recurring classes from the database.

## Changes Made

### 1. Backend - Database Seeding Script
**File Created:** `backend/scripts/seedWeeklyClasses.js`

- Created a script to populate the database with 6 weekly recurring class events (3 classes × 2 time slots each)
- Each class is set to recur weekly (every 7 days)
- Event type set to `TRIAL` to allow both subscription users and trial users to register

**Weekly Classes Added:**
1. **תרגיל מתחלף - שיעור הדגל** (Wednesday)
   - Time slots: 18:00-19:30 and 19:30-21:00
   - Description: Advanced class with rotating exercises
   - Max 8 attendees per slot

2. **פורטרט** (Tuesday)
   - Time slots: 18:00-19:30 and 19:30-21:00
   - Description: Portrait drawing focused on realism
   - Max 8 attendees per slot

3. **רישום** (Sunday)
   - Time slots: 18:00-19:30 and 19:30-21:00
   - Description: Drawing class for beginners, realistic techniques
   - Max 8 attendees per slot

**To run the seed script:**
```bash
cd backend
npm run seed:classes
```

### 2. Backend - Package.json Update
**File Modified:** `backend/package.json`

- Added new script command `seed:classes` to easily run the seeding script

### 3. Frontend - CalendarScreen Updates
**File Modified:** `frontend/src/screens/main/CalendarScreen.js`

**Key Changes:**
1. **Imports Added:**
   - `useQuery` from `@apollo/client` for GraphQL data fetching
   - `GET_EVENTS` query from the queries file
   - `showErrorToast` for error handling
   - `useEffect` for side effects
   - `ActivityIndicator` for loading states

2. **GraphQL Integration:**
   - Integrated `GET_EVENTS` query to fetch events from the database
   - Implemented date range calculation to fetch events for the current week
   - Added `fetchPolicy: 'cache-and-network'` for optimal performance

3. **Event Filtering:**
   - Created `eventsForSelectedDate` memo to filter events based on selected date
   - For recurring events: matches by day of week
   - For one-time events: matches by exact date

4. **UI Enhancements:**
   - Added loading state with spinner and Hebrew text "טוען אירועים..."
   - Added empty state for days with no classes: "אין שיעורים מתוכננים ליום זה"
   - Replaced mock data with real events from the database
   - Error toast notification if events fail to load

5. **Code Cleanup:**
   - Removed duplicate `getWeekDates` function
   - Removed mock events data
   - Fixed function hoisting issues

## How It Works

1. **Week View:**
   - CalendarScreen calculates the current week (Sunday to Saturday)
   - Fetches all events within that week from the database via GraphQL

2. **Day Selection:**
   - When user selects a day, events are filtered to show only classes for that day
   - Recurring events are matched by day of week (e.g., all Wednesday classes show on any Wednesday)
   - One-time events are matched by exact date

3. **Event Display:**
   - Events are displayed using the existing `EventCard` component
   - Shows title, instructor, time, duration, and available spots
   - Loading indicator appears while fetching data
   - Empty state message shown when no classes scheduled

## Data Flow

```
Database (Firestore)
  → GraphQL Query (GET_EVENTS)
  → Apollo Client Cache
  → CalendarScreen Component
  → Event Filtering (by selected date)
  → EventCard Components
```

## Event Types

Events are created with `eventType: 'trial'` which allows:
- Trial users to book their first class
- Subscription users to attend with their subscription
- Both user types can see and register for these classes

## Future Enhancements

- [ ] Implement user registration status checking (currently shows all events as not registered)
- [ ] Add pull-to-refresh functionality
- [ ] Implement the "הרישומים שלי" (My Registrations) tab
- [ ] Add event filtering by event type
- [ ] Implement real-time updates when events change

## Testing

To test the implementation:

1. **Seed the database:**
   ```bash
   cd backend
   npm run seed:classes
   ```

2. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

4. **Navigate to Calendar screen:**
   - Select different days to see weekly classes
   - Sunday: רישום classes
   - Tuesday: פורטרט classes
   - Wednesday: תרגיל מתחלף classes
   - Other days: Empty state

## Notes

- All classes are taught by "יערה בודה" (Instructor name)
- Each class has exactly 8 spots available
- Classes recur every 7 days (weekly)
- All times are 90-minute sessions
- Events are active and available for registration
