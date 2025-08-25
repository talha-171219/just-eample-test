// store.js
import { db, ts, auth } from "./firebase.js";
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

// --- Existing exports ---
export const REACTIONS = ["😁", "😂", "😅", "😍", "😥", "😒", "😔", "😭"];

export async function addMessage(userId, text) {
  await addDoc(collection(db, "messages"), {
    userId,
    text,
    createdAt: ts(),
    reactions: {}
  });
}

export function listenMessages(callback) {
  const q = query(
    collection(db, "messages"),
    orderBy("createdAt", "asc"),
    limit(50)
  );
  return onSnapshot(q, callback);
}

export async function addReaction(messageId, emoji) {
  const msgRef = doc(db, "messages", messageId);
  await updateDoc(msgRef, {
    [`reactions.${emoji}`]: increment(1)
  });
}

export async function getMessage(messageId) {
  const ref = doc(db, "messages", messageId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  } else {
    throw new Error("Message not found");
  }
}

export async function queryMessages(field, op, value) {
  const q = query(
    collection(db, "messages"),
    where(field, op, value)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- NEW: Functions required by ui.js ---

export function listUsersRealtime(callback) {
  const q = query(collection(db, "users"), orderBy("displayName", "asc"));
  return onSnapshot(q, snap => {
    const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    callback(users);
  });
}

export async function getOrCreateConversation(peerUid) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Not logged in");

  const convQuery = query(
    collection(db, "conversations"),
    where("members", "in", [[me, peerUid], [peerUid, me]]),
    limit(1)
  );
  const snap = await getDocs(convQuery);
  if (!snap.empty) return snap.docs[0].id;

  const docRef = await addDoc(collection(db, "conversations"), {
    members: [me, peerUid],
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export function streamMessages(convId, callback) {
  const msgsRef = collection(db, "conversations", convId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

export async function sendMessage(convId, text, replyTo = null) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Not logged in");

  const msgData = {
    senderUid: me,
    text,
    createdAt: serverTimestamp(),
    reactions: {},
    replyTo: replyTo
      ? { id: replyTo.id, text: replyTo.text || "" }
      : null
  };

  await addDoc(collection(db, "conversations", convId, "messages"), msgData);
}

export async function toggleReaction(convId, msgId, emoji, userId) {
  const msgRef = doc(db, "conversations", convId, "messages", msgId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data();
  let reactions = data.reactions || {};
  let list = reactions[emoji] || [];

  if (list.includes(userId)) {
    list = list.filter(uid => uid !== userId);
  } else {
    list.push(userId);
  }
  reactions[emoji] = list;
  await updateDoc(msgRef, { reactions });
}

export async function markRead(convId) {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Not logged in");
  const convRef = doc(db, "conversations", convId);
  await updateDoc(convRef, { [`read.${me}`]: serverTimestamp() });
}

export async function getUser(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}
