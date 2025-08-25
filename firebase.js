// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

// Use your provided config
const firebaseConfig = {
  apiKey: "AIzaSyB2PcLHyYtR-dOMUgKnqKF4dKTrUZRjf-I",
  authDomain: "chat-bot-ai-cc7cf.firebaseapp.com",
  projectId: "chat-bot-ai-cc7cf",
  storageBucket: "chat-bot-ai-cc7cf.appspot.com",
  messagingSenderId: "949908800966",
  appId: "1:949908800966:web:61d644a9c66e01bf6e1ec7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const ts = () => serverTimestamp();
