import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

// Messages
export async function sendMessage({ roomId, text, user }) {
  if (!roomId) throw new Error("roomId is required");
  return addDoc(collection(db, "messages"), {
    text,
    roomId,
    createdAt: serverTimestamp(),
    userId: user?.id,
    userEmail: user?.email,
    displayName: user?.displayName || user?.email || "Anonymous",
  });
}

export function subscribeToMessages(roomId, callback) {
  if (!roomId) {
    console.warn("subscribeToMessages: No roomId provided");
    return () => {};
  }
  
  console.log("subscribeToMessages: Setting up subscription for roomId:", roomId);
  
  // Try with orderBy first (requires index)
  const q = query(
    collection(db, "messages"),
    where("roomId", "==", roomId),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      console.log("subscribeToMessages: Snapshot received, size:", snapshot.size);
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        console.log("Message doc:", doc.id, {
          text: docData.text,
          roomId: docData.roomId,
          userId: docData.userId,
          createdAt: docData.createdAt,
        });
        return {
          id: doc.id,
          ...docData,
        };
      });
      
      // Sort by createdAt if available (fallback if orderBy didn't work)
      data.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.toDate?.() || b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      
      console.log("subscribeToMessages: Calling callback with", data.length, "messages");
      console.log("subscribeToMessages: Messages:", data.map(m => ({ id: m.id, text: m.text, roomId: m.roomId })));
      callback(data);
    },
    (error) => {
      console.error("❌ Error subscribing to messages:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // If index is missing, try without orderBy as fallback
      if (error.code === 'failed-precondition') {
        console.warn("⚠️ Firestore index missing! Trying fallback query without orderBy...");
        console.warn("⚠️ Create an index for messages collection with fields: roomId (Ascending), createdAt (Ascending)");
        
        // Fallback: query without orderBy
        const fallbackQ = query(
          collection(db, "messages"),
          where("roomId", "==", roomId)
        );
        
        return onSnapshot(
          fallbackQ,
          (snapshot) => {
            console.log("Fallback query: Snapshot received, size:", snapshot.size);
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            
            // Sort manually by createdAt
            data.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || a.createdAt?.seconds || 0;
              const bTime = b.createdAt?.toDate?.() || b.createdAt?.seconds || 0;
              return aTime - bTime;
            });
            
            console.log("Fallback query: Calling callback with", data.length, "messages");
            callback(data);
          },
          (fallbackError) => {
            console.error("Fallback query also failed:", fallbackError);
            callback([]);
          }
        );
      } else {
        callback([]);
      }
    }
  );
}

// Get all conversations for a user (both matches and direct messages)
export async function getAllConversations(userId) {
  if (!userId) return { matches: [], directMessages: [] };
  
  try {
    // Get all messages where user is involved
    // We need to check both possible roomId formats: userId1_userId2 or userId2_userId1
    const allMessages = await getDocs(collection(db, "messages"));
    
    // Extract unique conversation partners
    const conversationPartners = new Set();
    const conversationMap = new Map(); // userId -> { lastMessage, lastMessageTime }
    
    allMessages.docs.forEach((doc) => {
      const message = doc.data();
      const roomId = message.roomId;
      
      // Parse roomId (format: userId1_userId2 where userIds are sorted)
      if (roomId && roomId.includes("_")) {
        const [userId1, userId2] = roomId.split("_");
        
        if (userId1 === userId || userId2 === userId) {
          const otherUserId = userId1 === userId ? userId2 : userId1;
          conversationPartners.add(otherUserId);
          
          // Track last message for this conversation
          const lastMessageTime = message.createdAt?.toDate?.() || new Date(0);
          const existing = conversationMap.get(otherUserId);
          
          if (!existing || lastMessageTime > existing.lastMessageTime) {
            conversationMap.set(otherUserId, {
              lastMessage: message.text,
              lastMessageTime: lastMessageTime,
            });
          }
        }
      }
    });
    
    // Get matches to separate matches from direct messages
    const matches = await getMatches(userId);
    const matchUserIds = new Set();
    matches.forEach((match) => {
      const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
      matchUserIds.add(otherUserId);
    });
    
    // Separate matches and direct messages
    const matchConversations = [];
    const directMessageConversations = [];
    
    conversationPartners.forEach((otherUserId) => {
      const conversationInfo = {
        userId: otherUserId,
        lastMessage: conversationMap.get(otherUserId)?.lastMessage || "",
        lastMessageTime: conversationMap.get(otherUserId)?.lastMessageTime || new Date(0),
      };
      
      if (matchUserIds.has(otherUserId)) {
        matchConversations.push(conversationInfo);
      } else {
        directMessageConversations.push(conversationInfo);
      }
    });
    
    // Sort by last message time (most recent first)
    matchConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    directMessageConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    
    return {
      matches: matchConversations,
      directMessages: directMessageConversations,
    };
  } catch (error) {
    console.error("Error getting conversations:", error);
    return { matches: [], directMessages: [] };
  }
}

// Rooms
export async function createRoom(name, user) {
  if (!name) throw new Error("Room name is required");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Room name cannot be empty");
  return addDoc(collection(db, "rooms"), {
    name: trimmed,
    createdAt: serverTimestamp(),
    createdBy: user?.id || user?.uid || null,
  });
}

export function subscribeToRooms(callback) {
  const q = query(collection(db, "rooms"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
}

export async function getRooms() {
  const snapshot = await getDocs(collection(db, "rooms"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// User profiles
export async function upsertUserProfile(userId, profile) {
  if (!userId) throw new Error("userId is required");
  return setDoc(
    doc(db, "users", userId),
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUserProfile(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getAllUserProfiles(excludeUserId) {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((user) => user.id !== excludeUserId && user.profileComplete);
}

// Matching algorithm
export function calculateCompatibility(user1, user2) {
  if (!user1.preferences || !user2.preferences) return 0;

  // Check gender preferences first - this is a dealbreaker if not compatible
  const user1Gender = user1.gender;
  const user2Gender = user2.gender;
  const user1GenderPref = user1.genderPreference || [];
  const user2GenderPref = user2.genderPreference || [];

  // If both users have gender preferences set, check compatibility
  if (user1GenderPref.length > 0 && user2GenderPref.length > 0 && user1Gender && user2Gender) {
    // Check if user1's gender matches user2's preferences
    const user1MatchesUser2Pref = 
      user2GenderPref.includes("any") || 
      user2GenderPref.includes(user1Gender);
    
    // Check if user2's gender matches user1's preferences
    const user2MatchesUser1Pref = 
      user1GenderPref.includes("any") || 
      user1GenderPref.includes(user2Gender);
    
    // If gender preferences don't match, return 0 (dealbreaker)
    if (!user1MatchesUser2Pref || !user2MatchesUser1Pref) {
      return 0;
    }
  }

  let score = 0;
  let factors = 0;

  // Cleanliness (closer is better)
  const cleanlinessDiff = Math.abs(
    (user1.preferences.cleanliness || 50) - (user2.preferences.cleanliness || 50)
  );
  score += Math.max(0, 100 - cleanlinessDiff * 2);
  factors++;

  // Noise level (closer is better)
  const noiseDiff = Math.abs(
    (user1.preferences.noiseLevel || 50) - (user2.preferences.noiseLevel || 50)
  );
  score += Math.max(0, 100 - noiseDiff * 2);
  factors++;

  // Smoking (exact match preferred)
  if (user1.preferences.smoking !== undefined && user2.preferences.smoking !== undefined) {
    const smokingDiff = Math.abs(
      (user1.preferences.smoking || 0) - (user2.preferences.smoking || 0)
    );
    if (smokingDiff < 33) {
      score += 100;
    } else if (smokingDiff < 66) {
      score += 50;
    }
    factors++;
  }

  // Pets (exact match preferred)
  if (user1.preferences.pets !== undefined && user2.preferences.pets !== undefined) {
    const petsDiff = Math.abs(
      (user1.preferences.pets || 50) - (user2.preferences.pets || 50)
    );
    if (petsDiff < 33) {
      score += 100;
    } else if (petsDiff < 66) {
      score += 50;
    }
    factors++;
  }

  // Guests (closer is better)
  const guestsDiff = Math.abs(
    (user1.preferences.guests || 50) - (user2.preferences.guests || 50)
  );
  score += Math.max(0, 100 - guestsDiff * 2);
  factors++;

  // Sleep schedule (closer is better)
  const sleepDiff = Math.abs(
    (user1.preferences.sleepSchedule || 50) - (user2.preferences.sleepSchedule || 50)
  );
  score += Math.max(0, 100 - sleepDiff * 2);
  factors++;

  // Budget (closer is better)
  const budgetDiff = Math.abs(
    (user1.preferences.budget || 50) - (user2.preferences.budget || 50)
  );
  score += Math.max(0, 100 - budgetDiff * 2);
  factors++;

  // Lease length (closer is better)
  const leaseDiff = Math.abs(
    (user1.preferences.leaseLength || 50) - (user2.preferences.leaseLength || 50)
  );
  score += Math.max(0, 100 - leaseDiff * 2);
  factors++;

  // Neighborhood match bonus - check for overlapping neighborhoods
  const user1Neighborhoods = user1.neighborhoods || (user1.neighborhood ? [user1.neighborhood] : []);
  const user2Neighborhoods = user2.neighborhoods || (user2.neighborhood ? [user2.neighborhood] : []);
  
  if (user1Neighborhoods.length > 0 && user2Neighborhoods.length > 0) {
    // Check if there's any overlap between the two users' neighborhood preferences
    const hasOverlap = user1Neighborhoods.some(n1 => user2Neighborhoods.includes(n1));
    if (hasOverlap) {
      score += 20;
      factors++;
    }
  }

  // Gender preference match bonus (if both have preferences and they match)
  if (user1GenderPref.length > 0 && user2GenderPref.length > 0 && user1Gender && user2Gender) {
    const user1MatchesUser2Pref = 
      user2GenderPref.includes("any") || 
      user2GenderPref.includes(user1Gender);
    const user2MatchesUser1Pref = 
      user1GenderPref.includes("any") || 
      user1GenderPref.includes(user2Gender);
    
    if (user1MatchesUser2Pref && user2MatchesUser1Pref) {
      score += 15; // Bonus for gender preference match
      factors++;
    }
  }

  return factors > 0 ? Math.round(score / factors) : 0;
}

// Matches
export async function createMatch(userId1, userId2) {
  const matchId = [userId1, userId2].sort().join("_");
  return setDoc(doc(db, "matches", matchId), {
    userId1,
    userId2,
    createdAt: serverTimestamp(),
    status: "matched",
  });
}

export async function getMatches(userId) {
  const q = query(
    collection(db, "matches"),
    where("userId1", "==", userId)
  );
  const snapshot1 = await getDocs(q);
  
  const q2 = query(
    collection(db, "matches"),
    where("userId2", "==", userId)
  );
  const snapshot2 = await getDocs(q2);

  const matches = [];
  snapshot1.docs.forEach((doc) => {
    matches.push({ id: doc.id, ...doc.data() });
  });
  snapshot2.docs.forEach((doc) => {
    matches.push({ id: doc.id, ...doc.data() });
  });

  return matches;
}

export async function checkMatch(userId1, userId2) {
  const matchId1 = [userId1, userId2].sort().join("_");
  const matchId2 = [userId2, userId1].sort().join("_");
  
  const match1 = await getDoc(doc(db, "matches", matchId1));
  const match2 = await getDoc(doc(db, "matches", matchId2));
  
  return match1.exists() || match2.exists();
}

// Likes and Passes
export async function likeUser(likerId, likedId) {
  if (!likerId || !likedId) throw new Error("likerId and likedId are required");
  
  const likeId = `${likerId}_${likedId}`;
  
  // Save the like
  await setDoc(doc(db, "likes", likeId), {
    likerId,
    likedId,
    createdAt: serverTimestamp(),
  });

  // Check if the other user has also liked this user (mutual like = match)
  const reverseLikeId = `${likedId}_${likerId}`;
  const reverseLike = await getDoc(doc(db, "likes", reverseLikeId));
  
  if (reverseLike.exists()) {
    // Mutual like! Create a match
    await createMatch(likerId, likedId);
    return { isMatch: true };
  }
  
  return { isMatch: false };
}

export async function passUser(passerId, passedId) {
  if (!passerId || !passedId) throw new Error("passerId and passedId are required");
  
  const passId = `${passerId}_${passedId}`;
  
  // Save the pass
  await setDoc(doc(db, "passes", passId), {
    passerId,
    passedId,
    createdAt: serverTimestamp(),
  });
}

export async function getUserLikes(userId) {
  if (!userId) return [];
  const q = query(
    collection(db, "likes"),
    where("likerId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getUserPasses(userId) {
  if (!userId) return [];
  const q = query(
    collection(db, "passes"),
    where("passerId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function hasLikedUser(likerId, likedId) {
  if (!likerId || !likedId) return false;
  const likeId = `${likerId}_${likedId}`;
  const likeDoc = await getDoc(doc(db, "likes", likeId));
  return likeDoc.exists();
}

export async function hasPassedUser(passerId, passedId) {
  if (!passerId || !passedId) return false;
  const passId = `${passerId}_${passedId}`;
  const passDoc = await getDoc(doc(db, "passes", passId));
  return passDoc.exists();
}

// Blocks & Reports
export async function blockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) throw new Error("blockerId and blockedId are required");

  const blockId = `${blockerId}_${blockedId}`;

  return setDoc(doc(db, "blocks", blockId), {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });
}

export async function getBlockedUsers(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, "blocks"),
    where("blockerId", "==", userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function isUserBlocked(userId1, userId2) {
  if (!userId1 || !userId2) return false;

  const blockId1 = `${userId1}_${userId2}`;
  const blockId2 = `${userId2}_${userId1}`;

  const block1 = await getDoc(doc(db, "blocks", blockId1));
  const block2 = await getDoc(doc(db, "blocks", blockId2));

  return block1.exists() || block2.exists();
}

export async function reportUser({
  reporterId,
  reportedUserId,
  reason,
  context = "match",
  additionalDetails = "",
}) {
  if (!reporterId || !reportedUserId) {
    throw new Error("reporterId and reportedUserId are required");
  }

  return addDoc(collection(db, "reports"), {
    reporterId,
    reportedUserId,
    reason: reason || "No reason provided",
    additionalDetails,
    context, // 'match' or 'message'
    createdAt: serverTimestamp(),
  });
}

// Saved Apartments
export async function saveApartment(userId, apartmentData) {
  if (!userId) throw new Error("userId is required");
  return addDoc(collection(db, "users", userId, "savedApartments"), {
    ...apartmentData,
    savedAt: serverTimestamp(),
  });
}

export async function getSavedApartments(userId) {
  if (!userId) return [];
  const snapshot = await getDocs(
    collection(db, "users", userId, "savedApartments")
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function removeSavedApartment(userId, apartmentId) {
  if (!userId || !apartmentId) throw new Error("userId and apartmentId are required");
  return deleteDoc(doc(db, "users", userId, "savedApartments", apartmentId));
}

// Delete user account - removes all user data from Firestore
export async function deleteUserAccount(userId) {
  if (!userId) throw new Error("userId is required");

  console.log("🗑️ Starting account deletion for user:", userId);
  
  const batch = writeBatch(db);
  let deleteCount = 0;

  try {
    // 1. Delete user profile
    const userProfileRef = doc(db, "users", userId);
    const userProfile = await getDoc(userProfileRef);
    if (userProfile.exists()) {
      batch.delete(userProfileRef);
      deleteCount++;
      console.log("✅ Queued user profile for deletion");
    }

    // 2. Delete all matches where user is involved
    const matches1 = await getDocs(
      query(collection(db, "matches"), where("userId1", "==", userId))
    );
    matches1.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    const matches2 = await getDocs(
      query(collection(db, "matches"), where("userId2", "==", userId))
    );
    matches2.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    console.log(`✅ Queued ${matches1.size + matches2.size} matches for deletion`);

    // 3. Delete all likes where user is liker or liked
    const likes1 = await getDocs(
      query(collection(db, "likes"), where("likerId", "==", userId))
    );
    likes1.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    const likes2 = await getDocs(
      query(collection(db, "likes"), where("likedId", "==", userId))
    );
    likes2.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    console.log(`✅ Queued ${likes1.size + likes2.size} likes for deletion`);

    // 4. Delete all passes where user is passer or passed
    const passes1 = await getDocs(
      query(collection(db, "passes"), where("passerId", "==", userId))
    );
    passes1.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    const passes2 = await getDocs(
      query(collection(db, "passes"), where("passedId", "==", userId))
    );
    passes2.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    console.log(`✅ Queued ${passes1.size + passes2.size} passes for deletion`);

    // 5. Delete all messages where user is involved
    const allMessages = await getDocs(collection(db, "messages"));
    allMessages.docs.forEach((doc) => {
      const message = doc.data();
      const roomId = message.roomId;
      if (roomId && roomId.includes("_")) {
        const [userId1, userId2] = roomId.split("_");
        if (userId1 === userId || userId2 === userId) {
          batch.delete(doc.ref);
          deleteCount++;
        }
      }
    });
    console.log(`✅ Queued messages for deletion`);

    // 6. Delete all blocks where user is blocker or blocked
    const blocks1 = await getDocs(
      query(collection(db, "blocks"), where("blockerId", "==", userId))
    );
    blocks1.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    const blocks2 = await getDocs(
      query(collection(db, "blocks"), where("blockedId", "==", userId))
    );
    blocks2.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    console.log(`✅ Queued ${blocks1.size + blocks2.size} blocks for deletion`);

    // 7. Delete all reports where user is reporter or reported
    const reports1 = await getDocs(
      query(collection(db, "reports"), where("reporterId", "==", userId))
    );
    reports1.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    const reports2 = await getDocs(
      query(collection(db, "reports"), where("reportedUserId", "==", userId))
    );
    reports2.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    console.log(`✅ Queued ${reports1.size + reports2.size} reports for deletion`);

    // 8. Delete saved apartments
    const savedApartments = await getDocs(
      collection(db, "users", userId, "savedApartments")
    );
    savedApartments.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    console.log(`✅ Queued ${savedApartments.size} saved apartments for deletion`);

    // Execute all deletions in a single batch
    if (deleteCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${deleteCount} documents`);
    } else {
      console.log("ℹ️ No documents found to delete");
    }

    return { success: true, deletedCount: deleteCount };
  } catch (error) {
    console.error("❌ Error deleting user account:", error);
    throw error;
  }
}
