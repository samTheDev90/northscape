import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDqIBcdraZznfMkS_u0McieJjNF5oX6xw",
  authDomain: "mission-panchagarh.firebaseapp.com",
  projectId: "mission-panchagarh",
  storageBucket: "mission-panchagarh.firebasestorage.app",
  messagingSenderId: "901754319379",
  appId: "1:901754319379:web:60cb82e541bd8fe00545e6",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

export const TRIP_DOC_COLLECTION = "tripData";
export const TRIP_DOC_ID = "main";
export const USERS_COLLECTION = "users";
export const INVITES_COLLECTION = "invites";
