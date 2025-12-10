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
  if (!roomId) return () => {};
  const q = query(
    collection(db, "messages"),
    where("roomId", "==", roomId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(data);
    },
    (error) => {
      console.error("Error subscribing to messages:", error);
      // If index is missing, Firebase will provide a link in the console
      callback([]);
    }
  );
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
