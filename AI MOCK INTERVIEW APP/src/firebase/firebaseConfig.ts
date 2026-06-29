import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_dDgTCKQi8Ecm5IkcRzhg_Wo63mSQ4NU",
  authDomain: "new-ai-mock.firebaseapp.com",
  projectId: "new-ai-mock",
  storageBucket: "new-ai-mock.firebasestorage.app",
  messagingSenderId: "191793993808",
  appId: "1:191793993808:web:0fe9df0ea912e989b21955",
  measurementId: "G-CZJKF55105"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);