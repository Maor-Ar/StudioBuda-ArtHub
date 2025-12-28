# OAuth Authentication - README

## 🎉 What's New

Google, Facebook, and Apple authentication are now **fully implemented** and ready to use!

## 📋 Quick Reference

### Files You Need to Know About

1. **`.env`** - Create this file with your OAuth credentials (see `.env.example`)
2. **`OAUTH_QUICKSTART.md`** - Quick setup guide (15-30 minutes)
3. **`OAUTH_SETUP.md`** - Detailed setup guide with troubleshooting

### What Works Now

✅ **Google Sign-In** - Users can sign in with their Google account
✅ **Facebook Login** - Users can sign in with Facebook
✅ **Apple Sign In** - iOS users can sign in with Apple (iOS 13+)
✅ **Auto-registration** - New users are automatically created
✅ **Seamless login** - Returning users are logged in instantly
✅ **Backend integration** - All OAuth flows connect to your GraphQL backend

### Before You Start

You need credentials from:
- [ ] Google Cloud Console (3 OAuth Client IDs)
- [ ] Facebook Developers (1 App ID)
- [ ] Apple Developer Portal (Enable Sign In with Apple)
- [ ] Firebase Console (Enable all providers)

### Setup Steps

1. **Quick Setup** (if you just want to get started):
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your credentials
   npm start
   ```
   Then see `OAUTH_QUICKSTART.md` for credential setup

2. **Detailed Setup** (for production):
   - Follow the complete guide in `OAUTH_SETUP.md`

### Testing

**IMPORTANT**: OAuth requires testing on **physical devices**. Simulators/emulators have limitations:
- Google Sign-In: Works on simulators but may have issues
- Facebook Login: Works on simulators
- Apple Sign In: **Only works on real iOS devices (iOS 13+)**

### Common Commands

```bash
# Start the app
npm start

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Check for missing dependencies
npm install
```

## 🔧 How It Works

### User Experience

1. User opens app → Sees login screen
2. User taps "המשך עם גוגל" (Continue with Google)
3. Google sign-in dialog appears
4. User signs in with Google
5. User is automatically logged into the app

### Technical Flow

```
LoginScreen/RegisterScreen
    ↓ User taps OAuth button
authService.getOAuthToken(provider)
    ↓ Opens provider sign-in
Provider SDK (Google/Facebook/Apple)
    ↓ Returns ID token
LOGIN_WITH_OAUTH GraphQL mutation
    ↓ Verifies token
Backend (Firebase + Firestore)
    ↓ Returns auth token
AuthContext.login()
    ↓ Stores token
User is logged in!
```

## 📂 Code Structure

```
src/
├── config/
│   └── firebase.js              # OAuth configuration
│
├── services/
│   ├── authService.js           # OAuth implementation
│   │   ├── signInWithGoogle()
│   │   ├── signInWithFacebook()
│   │   └── signInWithApple()
│   │
│   └── graphql/
│       └── mutations.js         # LOGIN_WITH_OAUTH
│
└── screens/
    └── auth/
        ├── LoginScreen.js       # OAuth buttons
        └── RegisterStep1Screen.js
```

## 🐛 Troubleshooting

### "Google sign in failed"
- Check your `.env` file has correct Client IDs
- For Android: Verify SHA-1 fingerprint in Google Cloud Console

### "Facebook login failed"
- Verify Facebook App ID in `.env`
- Check that Facebook Login product is added to your app

### "Apple Sign In not available"
- Test on a **real iOS device** (not simulator)
- Ensure iOS version is 13 or higher
- Verify "Sign In with Apple" is enabled in Apple Developer Portal

### "Cannot read environment variable"
- Make sure you created `.env` file (copy from `.env.example`)
- Restart the Metro bundler after changing `.env`

## 📱 Provider Specifics

### Google
- Requires 3 Client IDs (Web, iOS, Android)
- Works on both iOS and Android
- Provides email, name, and profile picture

### Facebook
- Requires App ID from Facebook Developers
- Works on both iOS and Android
- Provides email, name, and profile picture
- Users can review app permissions

### Apple
- No Client ID needed (uses bundle identifier)
- **iOS only**, requires iOS 13+
- **Physical device required** for testing
- Supports "Hide My Email" feature
- Provides email (or proxy email) and name

## 🔐 Security

- All OAuth tokens are verified on the backend via Firebase
- User credentials are never stored for OAuth users
- Tokens are stored securely in AsyncStorage
- `.env` files are in `.gitignore` (never committed to git)

## 📚 Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| `OAUTH_QUICKSTART.md` | Get started quickly | 5 min |
| `OAUTH_SETUP.md` | Complete setup guide | 30 min |
| `README_OAUTH.md` | This file | 5 min |

## 🚀 Next Steps

1. **For Developers**:
   - [ ] Read `OAUTH_QUICKSTART.md`
   - [ ] Create `.env` file
   - [ ] Get credentials from providers
   - [ ] Test on physical device

2. **For Production**:
   - [ ] Create production Firebase project
   - [ ] Generate release keys
   - [ ] Configure production credentials
   - [ ] Read full `OAUTH_SETUP.md` guide

## ❓ Need Help?

1. Check the troubleshooting section in `OAUTH_SETUP.md`
2. Verify all environment variables are set
3. Check Firebase Console logs
4. Review provider-specific documentation

---

**Happy coding!** 🎨
