# Coexist App - Setup Checklist

## ✅ What You Have
- React app with all features implemented
- Matching system (heart/X buttons)
- Messaging system
- Profile setup and editing
- Gender preferences
- Social media handles
- Multiple neighborhood selection
- Free tier restrictions (10 profiles, 1 direct message)

## 🔧 What You Need to Set Up

### 1. **Firebase Configuration** (REQUIRED)

You need to create a `.env` file in the `web/` directory with your Firebase credentials:

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Create a new project** (or use existing)
3. **Enable Authentication:**
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
4. **Set up Firestore Database:**
   - Go to Firestore Database
   - Create database in production mode
   - Choose your region
5. **Set up Storage:**
   - Go to Storage
   - Get started (use default rules for now)
6. **Get your config:**
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the config values

7. **Create `.env` file in `web/` directory:**
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. **Firestore Indexes** (REQUIRED)

You need to create these indexes in Firestore:

1. Go to Firestore Database → Indexes
2. Create these composite indexes:

**For Messages:**
- Collection: `messages`
- Fields: `roomId` (Ascending), `createdAt` (Ascending)

**For Matches:**
- Collection: `matches`
- Fields: `userId1` (Ascending)
- Fields: `userId2` (Ascending)

### 3. **Firestore Security Rules** (IMPORTANT)

Update your Firestore rules in Firebase Console → Firestore Database → Rules:

**Copy the complete rules from `FIRESTORE_RULES_COMPLETE.txt` or use the rules below:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is a participant in a room
    function isParticipantInRoom(roomId) {
      // roomId format is: userId1_userId2 (sorted alphabetically)
      let parts = roomId.split('_');
      return request.auth != null && 
             (parts[0] == request.auth.uid || parts[1] == request.auth.uid);
    }
    
    // USER PROFILES
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      match /savedApartments/{apartmentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // LIKES
    match /likes/{likeId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.resource.data.likerId == request.auth.uid;
      allow update, delete: if false;
    }
    
    // PASSES
    match /passes/{passId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.resource.data.passerId == request.auth.uid;
      allow update, delete: if false;
    }
    
    // MATCHES
    match /matches/{matchId} {
      allow read: if request.auth != null && 
        (resource.data.userId1 == request.auth.uid || 
         resource.data.userId2 == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.userId1 == request.auth.uid || 
         resource.data.userId2 == request.auth.uid);
    }
    
    // MESSAGES (Between Matches & Direct Messages)
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        isParticipantInRoom(resource.data.roomId);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid &&
        isParticipantInRoom(request.resource.data.roomId);
      allow update, delete: if false;
    }
    
    // BLOCKS
    match /blocks/{blockId} {
      allow read: if request.auth != null && 
        resource.data.blockerId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.blockerId == request.auth.uid;
      allow delete: if request.auth != null && 
        resource.data.blockerId == request.auth.uid;
      allow update: if false;
    }
    
    // REPORTS
    match /reports/{reportId} {
      allow read: if request.auth != null && 
        resource.data.reporterId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.reporterId == request.auth.uid;
      allow update, delete: if false;
    }
    
    // VERIFICATION CODES
    match /verificationCodes/{codeId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // WAITLIST
    match /waitlist/{waitlistId} {
      allow read: if false;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

### 4. **Storage Security Rules** (IMPORTANT)

Update your Storage rules in Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload/read their own profile pictures
    match /profilePictures/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. **Optional: Google Places API** (For Apartments - Currently Hidden)

When you're ready to enable apartment search:
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Places API and Geocoding API
3. Add to `.env`: `REACT_APP_GOOGLE_PLACES_API_KEY=your_key_here`
4. Uncomment apartments route in `App.js` and `BottomTabs.jsx`

## 🚀 Quick Start

1. **Create `.env` file** with Firebase config (see above)
2. **Set up Firestore indexes** (see above)
3. **Update security rules** (see above)
4. **Run the app:**
   ```bash
   cd web
   npm install  # If you haven't already
   npm start
   ```

## 📝 Testing Checklist

- [ ] Can create an account
- [ ] Can complete profile setup
- [ ] Can see other profiles
- [ ] Can like/pass on profiles
- [ ] Can send messages
- [ ] Can edit profile
- [ ] Profile pictures upload correctly
- [ ] Matches work correctly

## 🐛 Common Issues

**"Firebase configuration is missing"**
- Make sure `.env` file exists in `web/` directory
- Restart the dev server after creating `.env`

**"Permission denied" errors**
- Check Firestore security rules
- Make sure indexes are created

**"Index missing" errors**
- Go to Firestore → Indexes
- Create the required composite indexes
- Wait for them to build (can take a few minutes)

## 📦 Next Steps (Optional)

- Set up custom domain
- Configure email templates for Firebase Auth
- Set up analytics
- Prepare for deployment (Vercel, Netlify, Firebase Hosting)

