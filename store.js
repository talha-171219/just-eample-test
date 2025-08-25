// store.js
import { db, ts } from "./firebase.js";
import {
  addDoc, collection, doc, getDoc, getDocs,
  onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where, limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export async function addMessage(userId, text) {
  await addDoc(collection(db, "messages"), {
    userId,
    text,
    createdAt: ts()
  });
}

export function listenMessages(callback) {
  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"), limit(50));
  return onSnapshot(q, callback);
}
