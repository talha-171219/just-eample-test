// auth.js
import { auth, provider, db, ts } from "./firebase.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Google Sign-in
export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign-in error:", error);
  }
}

// Sign-out
export function logOut() {
  signOut(auth);
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        createdAt: ts()
      });
    }
  }
});
// -----------------------------------
// Password Gate Logic Start
// -----------------------------------

const passInput    = document.getElementById("pass-input");
const passSubmit   = document.getElementById("pass-submit");
const passError    = document.getElementById("pass-error");
const passwordGate = document.getElementById("password-gate");
const authGate     = document.getElementById("auth-gate");
const CORRECT_PASS = "1234"; // এখানে আপনার নিরাপদ পাসওয়ার্ড দিন

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
  if (e.key === "Enter") {
    passSubmit.click();
  }
});

// -----------------------------------
// Password Gate Logic End
// -----------------------------------


