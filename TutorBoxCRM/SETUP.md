# TutorBoxCRM - Setup Guide

## Prerequisites

- Node.js >= 20
- React Native development environment set up
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## 1. Install Dependencies

```bash
cd TutorBoxCRM
npm install
```

## 2. Firebase Configuration

### Android Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `ciudad-bilingue-crm` project
3. Go to Project Settings > Your apps > Android
4. Download `google-services.json`
5. Place it in: `TutorBoxCRM/android/app/google-services.json`

**Important:** This file is in `.gitignore` and should NEVER be committed!

### iOS Setup (Optional)

1. In Firebase Console, add iOS app
2. Download `GoogleService-Info.plist`
3. Place it in: `TutorBoxCRM/ios/GoogleService-Info.plist`

## 3. Environment Variables

Create `.env` file in the project root (copy from `.env.example`):

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyCuq1z8eTo9rufdEDXQFfvoxOkce-kBWOY
FIREBASE_AUTH_DOMAIN=ciudad-bilingue-crm.firebaseapp.com
FIREBASE_DATABASE_URL=https://ciudad-bilingue-crm-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=ciudad-bilingue-crm
FIREBASE_STORAGE_BUCKET=ciudad-bilingue-crm.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=690594486040
```

## 4. Firebase Database Setup

### Add Class Locations (for GPS validation)

In Firebase Realtime Database, add locations under `/classLocations`:

```json
{
  "classLocations": {
    "main-campus": {
      "name": "Ciudad Bilingue - Main",
      "latitude": 4.6097,
      "longitude": -74.0817,
      "radius": 500,
      "active": true
    },
    "coats-location": {
      "name": "COATS",
      "latitude": 4.6200,
      "longitude": -74.0900,
      "radius": 500,
      "active": true
    }
  }
}
```

**Note:** Replace coordinates with actual school locations!

### Link Groups to Locations

In `/grupos2/{groupId}`, add `locationId` field:

```json
{
  "groupId": 123,
  "displayName": "Grupo A1",
  "locationId": "main-campus",
  ...
}
```

## 5. Running the App

### Android

```bash
# Start Metro bundler
npm start

# In another terminal, build and run
npm run android
```

### iOS (macOS only)

```bash
cd ios && pod install && cd ..
npm run ios
```

## 6. User Roles

The app supports three roles:
- **admin**: Full access to all modules
- **director**: Full access except admin settings
- **teacher**: Limited access (no phone numbers, no payments)

Users are configured in Firebase under `/users/{uid}/profile`:

```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "role": "teacher",
  "teacherId": "T001"
}
```

## 7. Troubleshooting

### Metro bundler issues
```bash
npm start -- --reset-cache
```

### Android build issues
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### iOS build issues
```bash
cd ios && pod deintegrate && pod install && cd ..
npm run ios
```

## Project Structure

```
TutorBoxCRM/
├── src/
│   ├── config/           # Firebase, GPS, permissions config
│   ├── context/          # Auth context
│   ├── services/         # Business logic (Auth, Attendance, etc.)
│   ├── screens/          # UI screens
│   ├── navigation/       # Navigation setup
│   └── types/            # TypeScript definitions
├── android/              # Android native code
├── ios/                  # iOS native code
└── package.json
```

## Key Features

1. **Attendance with GPS**: Teachers must be within 500m of class location
2. **Offline Support**: Queues attendance when offline, syncs when online
3. **Role-based Access**: Teachers can't see student phone numbers
4. **Shared Database**: Uses same Firebase as web CRM (gestion-ventas)
