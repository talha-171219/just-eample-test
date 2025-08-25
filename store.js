// store.js

import { db, ts } from "./firebase.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// 1) এই লিস্ট অনুযায়ী UI-এ বাটন দেখাবে
export const REACTIONS = ["😁", "😂", "😅", "😍", "😥", "😒", "😔", "😭"];

// 2) নতুন মেসেজ যোগ করা
export async function addMessage(userId, text) {
  await addDoc(collection(db, "messages"), {
    userId,
    text,
    createdAt: ts(),
    reactions: {}           // প্রতিটি মেসেজে reactions অবজেক্ট ইনিশিয়ালাইজ
  });
}

// 3) রিয়েলটাইমে মেসেজ লিসেন করা
export function listenMessages(callback) {
  const q = query(
    collection(db, "messages"),
    orderBy("createdAt", "asc"),
    limit(50)
  );
  return onSnapshot(q, callback);
}

// 4) একটা মেসেজের উপর রিয়্যাকশন বাড়ানো
export async function addReaction(messageId, emoji) {
  const msgRef = doc(db, "messages", messageId);
  await updateDoc(msgRef, {
    [`reactions.${emoji}`]: increment(1)
  });
}

// 5) (Optional) সিঙ্গেল মেসেজ ফেচ করা
export async function getMessage(messageId) {
  const ref = doc(db, "messages", messageId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  } else {
    throw new Error("Message not found");
  }
}

// 6) (Optional) কোনো কন্ডিশন দিয়ে মেসেজগুলো ফেচ করা
export async function queryMessages(field, op, value) {
  const q = query(
    collection(db, "messages"),
    where(field, op, value)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
