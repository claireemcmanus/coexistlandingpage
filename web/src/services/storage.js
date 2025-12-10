import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadProfilePicture(userId, file) {
  if (!userId || !file) {
    throw new Error("User ID and file are required");
  }

  // Create a reference to the file location
  const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${file.name}`);

  // Upload the file
  await uploadBytes(storageRef, file);

  // Get the download URL
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

