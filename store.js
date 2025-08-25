// store.js
import { db, ts } from "./firebase.js";
import {
  addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, limit
} from "firebase/firestore";
import { auth } from "./firebase.js";

export const REACTIONS = ["😀","😁","😂","😃","😥","😒","😔","😕","😠"];

export function convIdFor(u1, u2) {
  const [a, b] = [u1, u2].sort();
  return `${a}_${b}`;
}

export async function listUsersRealtime(callback) {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snap) => {
    const me = auth.currentUser?.uid;
    const arr = [];
    snap.forEach(d => {
      if (d.id !== me) arr.push({ uid: d.id, ...d.data() });
    });
    arr.sort((a,b) => (b.lastSeen?.toMillis?.() || 0) - (a.lastSeen?.toMillis?.() || 0));
    callback(arr);
  });
}

export async function getOrCreateConversation(peerUid) {
  const me = auth.currentUser?.uid;
  const id = convIdFor(me, peerUid);
  const cref = doc(db, "conversations", id);
  const snap = await getDoc(cref);
  if (!snap.exists()) {
    await setDoc(cref, {
      participants: [me, peerUid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null
    });
  }
  return id;
}

export function streamMessages(convId, callback) {
  const mref = collection(db, "conversations", convId, "messages");
  const qy = query(mref, orderBy("createdAt", "asc"));
  return onSnapshot(qy, (snap) => {
    const msgs = [];
    snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

export async function sendMessage(convId, text, replyTo = null) {
  const mref = collection(db, "conversations", convId, "messages");
  const me = auth.currentUser;
  const payload = {
    text, senderUid: me.uid, createdAt: serverTimestamp(),
    replyTo: replyTo ? {
      messageId: replyTo.id,
      text: replyTo.text?.slice(0, 160) || "",
      senderUid: replyTo.senderUid
    } : null,
    reactions: {},
    deliveredTo: { [me.uid]: serverTimestamp() },
    readBy: { [me.uid]: serverTimestamp() }
  };
  const docRef = await addDoc(mref, payload);
  const cref = doc(db, "conversations", convId);
  await updateDoc(cref, { updatedAt: ts(), lastMessage: { text: text.slice(0,120), at: ts(), by: me.uid } });
  return docRef.id;
}

export async function toggleReaction(convId, msgId, emoji, uid) {
  const ref = doc(db, "conversations", convId, "messages", msgId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const reactions = data.reactions || {};
  const arr = new Set(reactions[emoji] || []);
  if (arr.has(uid)) arr.delete(uid); else arr.add(uid);
  reactions[emoji] = Array.from(arr);
  await updateDoc(ref, { reactions });
}

export async function markRead(convId) {
  const me = auth.currentUser?.uid;
  const cref = doc(db, "conversations", convId);
  // keep it simple: update conversation-level read marker; per-message can be extended if needed
  await updateDoc(cref, { [`read_${me}`]: serverTimestamp(), updatedAt: ts() });
}

export async function getUser(uid) {
  const uref = doc(db, "users", uid);
  const snap = await getDoc(uref);
  return snap.exists() ? { uid, ...snap.data() } : null;
}
