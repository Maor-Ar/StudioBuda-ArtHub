# RTL Calendar Implementation - Hebrew/Israeli Best Practices

## Changes Made

### Calendar Screen RTL Updates
**File:** `frontend/src/screens/main/CalendarScreen.js`

### 1. Week Navigation (Arrow Buttons)
**Changed:** Swapped arrow button functionality for RTL layout

- **Right Arrow (→):** Now navigates to **PREVIOUS week** (was next week)
- **Left Arrow (←):** Now navigates to **NEXT week** (was previous week)

This follows Hebrew/Israeli best practices where:
- Future/forward = Left direction
- Past/backward = Right direction

### 2. Days of Week Display
**Changed:** Reversed the order of days to display right-to-left

**Before (LTR):**
```
א'  ב'  ג'  ד'  ה'  ו'  ש'
(Sun Mon Tue Wed Thu Fri Sat)
```

**After (RTL):**
```
ש'  ו'  ה'  ד'  ג'  ב'  א'
(Sat Fri Thu Wed Tue Mon Sun)
```

### 3. Date Numbers Display
**Changed:** Reversed the date numbers to match RTL layout

Now displays from Saturday (rightmost) to Sunday (leftmost), matching Hebrew calendar conventions.

## Testing Checklist

### Manual Testing Steps:

1. **Start the application:**
   ```bash
   cd frontend
   npm start
   ```

2. **Login with test credentials:**
   - Email: `maorarnon@gmail.com`
   - Password: `A1701rnon`

3. **Navigate to Calendar Screen:**
   - Should be accessible from the tab navigator
   - Icon should be visible in the bottom navigation

4. **Verify RTL Layout:**
   - [ ] Days of week show: ש' ו' ה' ד' ג' ב' א' (Saturday to Sunday, right to left)
   - [ ] Date numbers align right to left (Saturday on the right, Sunday on the left)
   - [ ] Right arrow (→) button moves to PREVIOUS week
   - [ ] Left arrow (←) button moves to NEXT week
   - [ ] Month name displays in Hebrew in the center

5. **Verify Events Display:**
   - [ ] **Sunday (א'):** Should show 2 events - רישום (18:00-19:30, 19:30-21:00)
   - [ ] **Tuesday (ג'):** Should show 2 events - פורטרט (18:00-19:30, 19:30-21:00)
   - [ ] **Wednesday (ד'):** Should show 2 events - תרגיל מתחלף - שיעור הדגל (18:00-19:30, 19:30-21:00)
   - [ ] **Other days:** Should show "אין שיעורים מתוכננים ליום זה"

6. **Verify Event Details:**
   For each event, check:
   - [ ] Title displays correctly in Hebrew
   - [ ] Instructor name: יערה בודה
   - [ ] Duration: 90 minutes (1.5 hours)
   - [ ] Max registrations: 8 attendees
   - [ ] Available spots calculation works correctly
   - [ ] Start times: 18:00 or 19:30

7. **Verify Loading States:**
   - [ ] Loading spinner shows with "טוען אירועים..." when fetching data
   - [ ] Empty state shows "אין שיעורים מתוכננים ליום זה" on days without events

8. **Test Navigation:**
   - [ ] Click on different dates within the week
   - [ ] Navigate forward one week using left arrow
   - [ ] Navigate backward one week using right arrow
   - [ ] Month name updates correctly when crossing month boundaries

## Expected Behavior

### Weekly Classes Schedule:
- **Sunday (ראשון):** רישום - 2 slots (18:00-19:30, 19:30-21:00)
- **Monday (שני):** No classes
- **Tuesday (שלישי):** פורטרט - 2 slots (18:00-19:30, 19:30-21:00)
- **Wednesday (רביעי):** תרגיל מתחלף - שיעור הדגל - 2 slots (18:00-19:30, 19:30-21:00)
- **Thursday (חמישי):** No classes
- **Friday (שישי):** No classes
- **Saturday (שבת):** No classes

### Event Card Details:
Each event card should display:
- **Title** (in large Hebrew text)
- **Instructor:** יערה בודה
- **Time:** 18:00 or 19:30
- **Duration:** 90 min
- **Capacity:** X/8 (where X is current registrations)
- **Register button** or **Registered indicator**

## Code Changes Summary

### Before (LTR):
```javascript
// Arrow buttons
<TouchableOpacity onPress={handlePreviousWeek}>
  <Text>←</Text>
</TouchableOpacity>
<TouchableOpacity onPress={handleNextWeek}>
  <Text>→</Text>
</TouchableOpacity>

// Days and dates
{daysOfWeek.map(...)}
{weekDates.map(...)}
```

### After (RTL):
```javascript
// Arrow buttons - SWAPPED functionality
<TouchableOpacity onPress={handleNextWeek}>
  <Text>←</Text>
</TouchableOpacity>
<TouchableOpacity onPress={handlePreviousWeek}>
  <Text>→</Text>
</TouchableOpacity>

// Days and dates - REVERSED order
{[...daysOfWeek].reverse().map(...)}
{[...weekDates].reverse().map(...)}
```

## Notes

- The RTL implementation follows Israeli/Hebrew UI conventions
- Arrow directions are semantic: Right = past/previous, Left = future/next
- Calendar maintains Sunday-Saturday week structure but displays it RTL
- All event data is fetched from the database via GraphQL
- Events are recurring weekly based on day of week

## Troubleshooting

If events don't show:
1. Verify backend server is running (`cd backend && npm start`)
2. Check that events were seeded (`cd backend && npm run seed:classes`)
3. Check browser console for GraphQL errors
4. Verify network connectivity between frontend and backend

If RTL layout looks incorrect:
1. Clear browser cache and reload
2. Check that the latest code changes are reflected
3. Verify no conflicting styles in parent components
