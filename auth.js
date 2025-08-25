// auth.js
import { auth, provider, db, ts } from "./firebase.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { initUI } from "./ui.js"; // ⬅ UI ইনিশিয়ালাইজার

// ---------- DOM ----------
const passwordGate = document.getElementById("password-gate");
const authGate     = document.getElementById("auth-gate");
const appEl        = document.getElementById("app");
const passInput    = document.getElementById("pass-input");
const passSubmit   = document.getElementById("pass-submit");
const passError    = document.getElementById("pass-error");
const googleBtn    = document.getElementById("google-signin");
const signoutBtn   = document.getElementById("signout");
const meAvatar     = document.getElementById("me-avatar");
const meName       = document.getElementById("me-name");
const meEmail      = document.getElementById("me-email");

// ---------- Auth actions ----------
export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign-in error:", error);
    const el = document.getElementById("auth-error");
    if (el) el.textContent = error.message || "Sign-in failed";
  }
}

export function logOut() {
  signOut(auth);
}

// ---------- Listeners on buttons ----------
googleBtn?.addEventListener("click", signInWithGoogle);
signoutBtn?.addEventListener("click", logOut);

// ---------- Password Gate ----------
const CORRECT_PASS = "1234";
passSubmit.addEventListener("click", () => {
  const entered = passInput.value.trim();
  if (entered === CORRECT_PASS) {
    passwordGate.classList.remove("show");
    passwordGate.classList.add("hidden");
    authGate.classList.add("show");
  } else {
    passError.textContent = "ভুল পাসওয়ার্ড, আবার চেষ্টা করুন।";
  }
});
passInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") passSubmit.click();
});

// ---------- Auth state ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ensure user doc
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        createdAt: ts()
      });
    }

    // update UI
    if (meAvatar) meAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || "User");
    if (meName)   meName.textContent = user.displayName || "(no name)";
    if (meEmail)  meEmail.textContent = user.email || "";

    passwordGate.classList.add("hidden");
    authGate.classList.remove("show");
    authGate.classList.add("hidden");
    appEl.classList.remove("hidden");

    // start UI (people list, messages, etc.)
    initUI();
  } else {
    // signed out: show password gate again
    appEl.classList.add("hidden");
    authGate.classList.remove("show");
    authGate.classList.add("hidden");
    passwordGate.classList.remove("hidden");
    passwordGate.classList.add("show");
  }
});
