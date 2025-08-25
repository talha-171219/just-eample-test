import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2PcLHyYtR-dOMUgKnqKF4dKTrUZRjf-I",
  authDomain: "chat-bot-ai-cc7cf.firebaseapp.com",
  projectId: "chat-bot-ai-cc7cf",
  storageBucket: "chat-bot-ai-cc7cf.firebasestorage.app",
  messagingSenderId: "949908800966",
  appId: "1:949908800966:web:61d644a9c66e01bf6e1ec7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
