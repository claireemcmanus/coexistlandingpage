import React, { useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function FirebaseTest() {
  useEffect(() => {
    console.log("FirebaseTest useEffect is running...");
    async function testFirebase() {
      try {
        // 1. Write a test document
        console.log("Attempting to write test document...");
        const docRef = await addDoc(collection(db, "testCollection"), {
          message: "Firebase is connected!",
          timestamp: new Date(),
        });

        console.log("Test document written with ID:", docRef.id);

        // 2. Read back documents
        console.log("Attempting to read documents...");
        const querySnapshot = await getDocs(collection(db, "testCollection"));
        querySnapshot.forEach((doc) => {
          console.log("Found document:", doc.id, doc.data());
        });
        console.log("Firebase test completed successfully.");
      } catch (e) {
        console.error("Firebase test failed:", e);
      }
    }

    testFirebase();
  }, []);

  return <h2>Running Firebase Test… check console!</h2>;
}
