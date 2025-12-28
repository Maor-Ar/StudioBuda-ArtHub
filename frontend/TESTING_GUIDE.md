# Testing Guide - Authentication & Registration

This guide explains how to test all the authentication features we've implemented.

## Test Credentials

**Email**: `maorarnon@gmail.com`
**Password**: `A1701rnon`

---

## Prerequisites

Before testing, ensure:
1. Backend server is running
2. Database is accessible
3. You have Expo Go app installed on your phone OR an iOS/Android emulator

---

## How to Test

### Option 1: Physical Device (Recommended)

This is the **best way** to test OAuth functionality (Google, Facebook, Apple):

1. **Start the development server**:
   ```bash
   cd frontend
   npm start
   ```

2. **Scan the QR code**:
   - iOS: Open Camera app and scan the QR code
   - Android: Open Expo Go app and scan the QR code

3. **Test the features** (see test cases below)

### Option 2: iOS Simulator

OAuth will work, but Apple Sign In requires a physical device:

1. **Start iOS simulator**:
   ```bash
   cd frontend
   npm run ios
   ```

2. **Test the features** (Google and Facebook will work, Apple won't)

### Option 3: Android Emulator

OAuth requires Google Play Services:

1. **Start Android emulator**:
   ```bash
   cd frontend
   npm run android
   ```

2. **Ensure emulator has Google Play Services**
3. **Test the features**

### Option 4: Web (Limited)

⚠️ **Warning**: OAuth won't work properly on web. Use this only for basic UI testing.

1. **Start web version**:
   ```bash
   cd frontend
   npm run web
   ```

2. **Open browser**: Usually `http://localhost:8081`
3. **Test email/password only** (OAuth buttons won't function correctly)

---

## Test Cases

### 1. Email/Password Login ✅

**Test**: Login with existing account

**Steps**:
1. Open the app
2. You should see the Login screen
3. Enter email: `maorarnon@gmail.com`
4. Enter password: `A1701rnon`
5. Tap "תכניסו אותי" (Log me in)

**Expected Results**:
- ✅ Loading state appears on button ("נכנס...")
- ✅ Success toast appears: "התחברת בהצלחה!"
- ✅ User is logged in and navigated to main app
- ✅ If credentials are wrong: "נראה שטעית באחד מהשדות, נסה שוב"

---

### 2. Email Validation ✅

**Test**: Invalid email format

**Steps**:
1. On Login screen, enter: `notanemail`
2. Tap "תכניסו אותי"

**Expected Results**:
- ✅ Input field shows red border
- ✅ Error text below input: "כתובת האימייל אינה תקינה"
- ✅ Toast notification: "כתובת האימייל אינה תקינה"
- ✅ Form doesn't submit

**Test**: Empty email

**Steps**:
1. Leave email field empty
2. Tap "תכניסו אותי"

**Expected Results**:
- ✅ Input field shows red border
- ✅ Error text: "אנא הזן כתובת אימייל"
- ✅ Toast notification appears

---

### 3. Password Validation ✅

**Test**: Empty password

**Steps**:
1. Enter valid email
2. Leave password empty
3. Tap "תכניסו אותי"

**Expected Results**:
- ✅ Password field shows red border
- ✅ Error text: "אנא הזן סיסמה"
- ✅ Toast notification appears

---

### 4. Registration - Step 1 (Email) ✅

**Test**: Email validation on registration

**Steps**:
1. From Login screen, tap "אין לך עדיין חשבון? הרשם כאן"
2. Enter invalid email: `test@`
3. Tap "המשך"

**Expected Results**:
- ✅ Input shows red border
- ✅ Error text: "כתובת האימייל אינה תקינה"
- ✅ Toast notification appears
- ✅ Doesn't navigate to Step 2

**Test**: Valid email

**Steps**:
1. Enter valid email: `newuser@example.com`
2. Tap "המשך"

**Expected Results**:
- ✅ Navigates to Step 2
- ✅ Email is pre-filled and disabled

---

### 5. Registration - Step 2 (Details) ✅

**Test**: All field validations

**Steps**:
1. Try submitting with empty fields
2. Fill in one field at a time and check validation

**Expected Results for Each Field**:

**First Name**:
- Empty → "אנא הזן שם פרטי"
- Too short (1 char) → "שם פרטי חייב להכיל לפחות 2 תווים"

**Last Name**:
- Empty → "אנא הזן שם משפחה"
- Too short (1 char) → "שם משפחה חייב להכיל לפחות 2 תווים"

**Phone**:
- Empty → "אנא הזן מספר טלפון"
- Invalid → "מספר הטלפון אינו תקין"
- Valid: `0501234567` or `050-123-4567`

**Password**:
- Empty → "אנא הזן סיסמה"
- Too short → "הסיסמה חייבת להכיל לפחות 8 תווים"
- No uppercase → "הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית"
- No lowercase → "הסיסמה חייבת להכיל לפחות אות קטנה אחת באנגלית"
- No digit → "הסיסמה חייבת להכיל לפחות ספרה אחת"
- Valid: `Password123`

**Confirm Password**:
- Empty → "אנא אמת את הסיסמה"
- Doesn't match → "הסיסמאות אינן תואמות"

---

### 6. Google Sign-In ✅

**Test**: Google OAuth flow

**Steps**:
1. On Login or Register screen, tap "המשך עם גוגל"
2. Complete Google sign-in

**Expected Results**:
- ✅ Loading overlay appears: "מתחבר..."
- ✅ Google sign-in dialog opens
- ✅ After successful sign-in: "התחברת בהצלחה!"
- ✅ User is logged in
- ✅ If cancelled: No error message
- ✅ If failed: "ההתחברות עם Google נכשלה, נסה שוב"

**Note**: Requires OAuth credentials configured in `.env`

---

### 7. Facebook Login ✅

**Test**: Facebook OAuth flow

**Steps**:
1. Tap "המשך עם פייסבוק"
2. Complete Facebook login

**Expected Results**:
- ✅ Loading overlay appears
- ✅ Facebook login dialog opens
- ✅ After successful login: "התחברת בהצלחה!"
- ✅ User is logged in
- ✅ If cancelled: No error message
- ✅ If failed: "ההתחברות עם Facebook נכשלה, נסה שוב"

**Note**: Requires Facebook App ID configured

---

### 8. Apple Sign In ✅

**Test**: Apple OAuth flow

**Steps**:
1. Tap "המשך עם אפל"
2. Complete Apple sign-in

**Expected Results**:
- ✅ Loading overlay appears
- ✅ Apple sign-in dialog opens (iOS 13+ only)
- ✅ After successful sign-in: "התחברת בהצלחה!"
- ✅ User is logged in
- ✅ If not available: "התחברות עם Apple לא זמינה במכשיר זה"
- ✅ If cancelled: No error message

**Note**:
- Only works on physical iOS devices (iOS 13+)
- Won't work in simulator or on Android

---

### 9. Backend Error Handling ✅

**Test**: Server error

**Simulate**: Stop the backend server

**Steps**:
1. Try to log in

**Expected Results**:
- ✅ Toast: "אופס, נראה שיש בעיה בשרת, תנסה שוב מאוחר יותר"

**Test**: Network error

**Simulate**: Turn off WiFi/mobile data

**Steps**:
1. Try to log in

**Expected Results**:
- ✅ Toast: "אופס, נראה שיש בעיה בחיבור לאינטרנט"

**Test**: Email already exists

**Steps**:
1. Try to register with: `maorarnon@gmail.com`

**Expected Results**:
- ✅ Toast: "כתובת האימייל כבר קיימת במערכת"

---

### 10. Input Autocomplete Disabled ✅

**Test**: Browser autocomplete prevention

**Steps**:
1. Start typing in any input field
2. Check if browser suggests autocomplete

**Expected Results**:
- ✅ No browser autocomplete suggestions appear
- ✅ No autofill prompts
- ✅ All fields have `autoComplete="off"`

---

### 11. Error Clearing ✅

**Test**: Errors clear when user types

**Steps**:
1. Submit form with invalid data (get errors)
2. Start typing in a field with error

**Expected Results**:
- ✅ Red border disappears as soon as you type
- ✅ Error text below field disappears
- ✅ Visual feedback is immediate

---

### 12. Visual Consistency ✅

**Test**: All screens match styling

**Check**:
- Login screen
- Register Step 1 screen
- Register Step 2 screen

**Expected Results**:
- ✅ Same purple background (#AB5FBD)
- ✅ Same pink input fields (#FFD1E3)
- ✅ Same button styles (#4E0D66)
- ✅ Same shadows and borders
- ✅ Same typography
- ✅ Same error styling (red borders)

---

### 13. Toast Notifications ✅

**Test**: Toast appearance and behavior

**Check any error scenario**

**Expected Results**:
- ✅ Toast appears at top of screen
- ✅ Hebrew text is right-aligned
- ✅ Auto-dismisses after 3-4 seconds
- ✅ Has appropriate color border (red for errors, green for success)
- ✅ Readable text
- ✅ Doesn't block important UI

---

## Common Issues & Solutions

### Issue: OAuth buttons don't work

**Solution**:
1. Check that OAuth credentials are in `.env` file
2. Ensure backend is running
3. Test on physical device (not simulator for Apple)
4. Check that OAuth providers are enabled in Firebase Console

### Issue: Toast doesn't appear

**Solution**:
1. Check that `<Toast config={toastConfig} />` is in App.js
2. Restart the app
3. Check console for errors

### Issue: Validation messages in English

**Solution**:
1. Check that you're importing from `../utils/validation`
2. Verify error messages are in Hebrew in `errorMessages.js`

### Issue: Inputs are autocompleting

**Solution**:
1. Check that `autoComplete="off"` is on all inputs
2. Some browsers ignore this - this is expected behavior
3. More aggressive: add `autoComplete="new-password"` to password fields

---

## Test Checklist

Use this checklist to verify all features:

- [ ] Login with correct credentials works
- [ ] Login with wrong credentials shows error
- [ ] Email validation works (empty, invalid format)
- [ ] Password validation works (empty field)
- [ ] Register Step 1 validates email
- [ ] Register Step 2 validates all fields
- [ ] Password strength requirements enforced
- [ ] Passwords must match
- [ ] Phone number validation works
- [ ] Google Sign-In works (if configured)
- [ ] Facebook Login works (if configured)
- [ ] Apple Sign In works (if configured, iOS only)
- [ ] Server errors show friendly message
- [ ] Network errors show friendly message
- [ ] Success toasts appear
- [ ] Error toasts appear
- [ ] Errors clear when typing
- [ ] All screens have consistent styling
- [ ] Autocomplete is disabled
- [ ] Loading states work
- [ ] Navigation between screens works
- [ ] Hebrew text displays correctly (RTL)

---

## Video Recording Recommendation

For comprehensive testing documentation:
1. Record screen while going through all test cases
2. Test on both iOS and Android if possible
3. Include successful and failed scenarios
4. Show toast notifications appearing
5. Demonstrate error clearing

---

## Automated Testing (Future)

Consider adding:
- Jest unit tests for validation functions
- React Native Testing Library for component tests
- E2E tests with Detox or Appium
- Backend integration tests

---

**Last Updated**: 2025-12-26
**Tested On**: React Native with Expo 54
**Test Environment**: Development
