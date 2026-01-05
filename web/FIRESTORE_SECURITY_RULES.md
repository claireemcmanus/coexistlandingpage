# Firestore Security Rules - Secure Message Privacy

## Current Issue

**⚠️ IMPORTANT:** The current security rules allow any authenticated user to read messages if they know the `roomId`. This is a security vulnerability.

## Secure Rules

Update your Firestore security rules in Firebase Console → Firestore Database → Rules:

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
    
    // Helper function to extract user IDs from roomId
    function getRoomParticipants(roomId) {
      let parts = roomId.split('_');
      return [parts[0], parts[1]];
    }
    
    // Messages - ONLY the two participants can read/write
    match /messages/{messageId} {
      // Allow read only if user is a participant in the room
      allow read: if request.auth != null && 
        isParticipantInRoom(resource.data.roomId);
      
      // Allow create only if:
      // 1. User is authenticated
      // 2. User is the sender (userId matches auth.uid)
      // 3. User is a participant in the room
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid &&
        isParticipantInRoom(request.resource.data.roomId);
      
      // Messages are immutable (no updates or deletes)
      allow update, delete: if false;
    }
    
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Users can read/write their own saved apartments
      match /savedApartments/{apartmentId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Matches - users can read their own matches
    match /matches/{matchId} {
      allow read: if request.auth != null && 
        (resource.data.userId1 == request.auth.uid || 
         resource.data.userId2 == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.userId1 == request.auth.uid || 
         resource.data.userId2 == request.auth.uid);
    }
    
    // Likes and Passes - users can read/write their own
    match /likes/{likeId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    match /passes/{passId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Blocks - users can read/write their own blocks
    match /blocks/{blockId} {
      allow read: if request.auth != null && 
        resource.data.blockerId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.blockerId == request.auth.uid;
      allow delete: if request.auth != null && 
        resource.data.blockerId == request.auth.uid;
    }
    
    // Reports - users can create reports, admins can read
    match /reports/{reportId} {
      allow create: if request.auth != null && 
        request.resource.data.reporterId == request.auth.uid;
      allow read: if request.auth != null && 
        resource.data.reporterId == request.auth.uid;
      // Note: Admins would need custom logic or a separate admin collection
    }
    
    // Verification codes - users can read/write their own
    match /verificationCodes/{codeId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Waitlist (for landing page)
    match /waitlist/{waitlistId} {
      allow read: if false; // No one can read waitlist entries
      allow create: if true; // Anyone can add themselves to waitlist
      allow update, delete: if false; // No updates or deletes
    }
  }
}
```

## How It Works

1. **Message Privacy**: The `isParticipantInRoom()` function checks if the authenticated user's ID is one of the two user IDs in the `roomId`.

2. **RoomId Format**: Messages use `roomId` in the format `userId1_userId2` where user IDs are sorted alphabetically (e.g., `abc123_def456`).

3. **Read Access**: Users can only read messages where their user ID is part of the `roomId`.

4. **Write Access**: Users can only create messages:
   - Where they are the sender (`userId == auth.uid`)
   - In a room where they are a participant

## Testing

After updating the rules, test:

1. **User A and User B** should be able to read messages in their shared room
2. **User C** should NOT be able to read messages between User A and User B
3. **User A** should NOT be able to create messages as User B (userId must match auth.uid)

## Important Notes

- The `roomId` format must always be `userId1_userId2` with sorted user IDs
- Never allow users to specify arbitrary `roomId` values
- Always validate that the sender's `userId` matches `request.auth.uid`

