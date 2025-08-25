// store.js
import { db, auth } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// -----------------------------
// Constants
// -----------------------------
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

// -----------------------------
// Users
// -----------------------------

// Listen all users
export function listenUsers(callback) {
  return onSnapshot(collection(db, "users"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Get single user
export async function getUser(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  } else {
    return null;
  }
}

// -----------------------------
// Conversations
// -----------------------------

export async function getOrCreateConversation(peerUid) {
  const me = auth.currentUser.uid;

  // check existing conversation
  const convQuery = query(
    collection(db, "conversations"),
    where("participants", "in", [
      [me, peerUid],
      [peerUid, me]
    ])
  );

  const snap = await getDocs(convQuery);
  if (!snap.empty) {
    return snap.docs[0].id;
  }

  // if not exist → create new
  const docRef = await addDoc(collection(db, "conversations"), {
    participants: [me, peerUid],
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

export function listenConversations(callback) {
  const me = auth.currentUser.uid;
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", me),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// -----------------------------
// Messages
// -----------------------------

export async function sendMessage(convId, text, replyTo = null) {
  const me = auth.currentUser.uid;
  const msgData = {
    senderUid: me,
    text,
    createdAt: serverTimestamp(),
    reactions: {}, // keep reaction structure
    deliveredTo: { [me]: true }, // ✅ rules compatibility
    replyTo: replyTo
      ? { id: replyTo.id, text: replyTo.text || "" }
      : null
  };
  await addDoc(collection(db, "conversations", convId, "messages"), msgData);
}

export function listenMessages(convId, callback) {
  const q = query(
    collection(db, "conversations", convId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function reactMessage(convId, msgId, emoji) {
  const me = auth.currentUser.uid;
  const msgRef = doc(db, "conversations", convId, "messages", msgId);
  const snap = await getDoc(msgRef);

  if (snap.exists()) {
    const data = snap.data();
    const reactions = data.reactions || {};

    // toggle system
    if (!reactions[emoji]) reactions[emoji] = [];
    if (!reactions[emoji].includes(me)) {
      reactions[emoji].push(me);
    } else {
      reactions[emoji] = reactions[emoji].filter((u) => u !== me);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    }

    await updateDoc(msgRef, { reactions });
  }
}

export async function markAsRead(convId, msgId) {
  const me = auth.currentUser.uid;
  const msgRef = doc(db, "conversations", convId, "messages", msgId);
  const snap = await getDoc(msgRef);

  if (snap.exists()) {
    const data = snap.data();
    const read = data.read || {};
    read[me] = serverTimestamp();
    await updateDoc(msgRef, { read });
  }
}

export async function deleteMessage(convId, msgId) {
  const msgRef = doc(db, "conversations", convId, "messages", msgId);
  await deleteDoc(msgRef);
}
