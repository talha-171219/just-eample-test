// auth.js
import { auth, provider, db, ts } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc
} from "firebase/firestore";

const PASS_KEY = "safetyPassOk";
const PASSWORD = "1234";

const $ = (q) => document.querySelector(q);
const show = (el, yes) => el.classList.toggle("show", !!yes);
const hideEl = (el, yes) => el.classList.toggle("hidden", !!yes);

const passGate = $("#password-gate");
const passInput = $("#pass-input");
const passSubmit = $("#pass-submit");
const passError = $("#pass-error");

const authGate = $("#auth-gate");
const googleBtn = $("#google-signin");
const authError = $("#auth-error");

const appRoot = $("#app");
const meName = $("#me-name");
const meEmail = $("#me-email");
const meAvatar = $("#me-avatar");

const nameModal = $("#name-modal");
const nameInput = $("#name-input");
const nameSave = $("#name-save");
const nameError = $("#name-error");

export let currentUser = null;

function openPasswordGateIfNeeded() {
  const ok = localStorage.getItem(PASS_KEY) === "1";
  if (!ok) {
    show(passGate, true);
    passInput.focus();
  } else {
    show(passGate, false);
    openAuthGate();
  }
}

passSubmit.addEventListener("click", () => {
  const v = passInput.value.trim();
  if (v === PASSWORD) {
    localStorage.setItem(PASS_KEY, "1");
    show(passGate, false);
    openAuthGate();
  } else {
    passError.textContent = "Wrong password.";
  }
});
passInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") passSubmit.click();
});

function openAuthGate() {
  show(authGate, true);
}

googleBtn.addEventListener("click", async () => {
  authError.textContent = "";
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    authError.textContent = e.message || "Sign-in failed.";
  }
});

$("#signout").addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show(authGate, true);
    hideEl(appRoot, true);
    return;
  }
  currentUser = user;
  show(authGate, false);
  await ensureUserDoc(user);
  await maybePromptDisplayName(user.uid);

  meName.textContent = user.displayName || "(no name)";
  meEmail.textContent = user.email || "";
  meAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || "User");

  hideEl(appRoot, false);

  // UI init after auth
  import("./ui.js").then(m => m.initUI());
});

async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const payload = {
    email: user.email || null,
    photoURL: user.photoURL || null,
    displayName: user.displayName || null,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    settings: { theme: "dark", accent: "green" }
  };
  if (!snap.exists()) {
    await setDoc(ref, payload, { merge: true });
  } else {
    await updateDoc(ref, { lastSeen: ts() });
  }
}

async function maybePromptDisplayName(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const dn = snap.data()?.displayName;
  if (!dn || dn.trim().length < 2) {
    nameInput.value = "";
    nameError.textContent = "";
    nameModal.classList.add("show");
    nameInput.focus();
    return new Promise((resolve) => {
      const handler = async () => {
        const v = nameInput.value.trim();
        if (v.length < 2) { nameError.textContent = "Name too short."; return; }
        await setDoc(ref, { displayName: v }, { merge: true });
        if (auth.currentUser && !auth.currentUser.displayName) {
          // local reflect
          auth.currentUser.displayName = v;
        }
        nameModal.classList.remove("show");
        resolve();
      };
      nameSave.onclick = handler;
      nameInput.onkeydown = (e) => { if (e.key === "Enter") handler(); };
    });
  }
}

openPasswordGateIfNeeded();
