import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadProfilePicture(userId, file) {
  if (!userId || !file) {
    throw new Error("User ID and file are required");
  }

  try {
    console.log("uploadProfilePicture: Starting upload for user:", userId);
    console.log("uploadProfilePicture: File name:", file.name);
    console.log("uploadProfilePicture: File size:", file.size, "bytes");
    console.log("uploadProfilePicture: File type:", file.type);

    // Create a reference to the file location
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
    console.log("uploadProfilePicture: Storage path:", `profile-pictures/${userId}/${fileName}`);

    // Upload the file
    console.log("uploadProfilePicture: Uploading bytes...");
    await uploadBytes(storageRef, file);
    console.log("uploadProfilePicture: Upload complete, getting download URL...");

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log("uploadProfilePicture: Download URL obtained:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("uploadProfilePicture: Error occurred:", error);
    console.error("uploadProfilePicture: Error code:", error.code);
    console.error("uploadProfilePicture: Error message:", error.message);
    throw error;
  }
}

