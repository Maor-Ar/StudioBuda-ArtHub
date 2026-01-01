# StudioBuda ArtHub - Frontend

React Native frontend application for StudioBuda art studio class registration.

## Technology Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **API**: GraphQL (Apollo Client)
- **Authentication**: Firebase Auth
- **Platforms**: iOS, Android, Web

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with Firebase credentials:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

3. Start the development server:
```bash
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── assets/          # Images, icons, SVGs
│   ├── components/      # Reusable components
│   ├── config/          # Configuration files
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # Screen components
│   ├── services/        # API services
│   └── utils/           # Utility functions
├── App.js              # Application entry point
└── package.json
```

