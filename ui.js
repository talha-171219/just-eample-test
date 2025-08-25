import {
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { auth, db } from "./firebase.js";

import {
  addMessage,
  subscribeMessages,
  subscribeConversations,
  toggleReaction,
  replyToMessage,
  updateProfileInfo,
} from "./store.js";

export function initUI() {
  const passwordGate = document.getElementById("password-gate");
  const passwordInput = document.getElementById("password-input");
  const passwordSubmit = document.getElementById("password-submit");
  const authGate = document.getElementById("auth-gate");
  const googleSignInBtn = document.getElementById("google-signin-btn");
  const anonSignInBtn = document.getElementById("anon-signin-btn");
  const mainUI = document.getElementById("main-ui");
  const messagesList = document.getElementById("messages");
  const sendBtn = document.getElementById("send-btn");
  const msgInput = document.getElementById("msg-input");
  const logoutBtn = document.getElementById("logout-btn");
  const profileBtn = document.getElementById("profile-btn");
  const profileModal = document.getElementById("profile-modal");
  const profileClose = document.getElementById("profile-close");
  const profileForm = document.getElementById("profile-form");
  const profileName = document.getElementById("profile-name");
  const profileAvatar = document.getElementById("profile-avatar");

  // ✅ Password gate
  passwordSubmit.addEventListener("click", () => {
    const pw = passwordInput.value.trim();
    if (pw === "258090") {
      passwordGate.classList.remove("show");
      passwordGate.classList.add("hidden");
      authGate.classList.add("show");
    } else {
      alert("Wrong password!");
    }
  });

  // ✅ Sign in Google
  googleSignInBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  });

  // ✅ Sign in Anonymous
  anonSignInBtn.addEventListener("click", async () => {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Anon sign in failed:", err);
    }
  });

  // ✅ Auth state listener
  auth.onAuthStateChanged((user) => {
    if (user) {
      authGate.classList.remove("show");
      authGate.classList.add("hidden");
      mainUI.classList.add("show");

      if (user.displayName) {
        profileName.value = user.displayName;
      }
      if (user.photoURL) {
        profileAvatar.value = user.photoURL;
      }

      subscribeMessages("general", renderMessages);
      subscribeConversations(renderConversations);
    } else {
      mainUI.classList.remove("show");
      authGate.classList.add("show");
    }
  });

  // ✅ Send Message
  sendBtn.addEventListener("click", async () => {
    const txt = msgInput.value.trim();
    if (!txt) return;
    msgInput.value = "";
    const user = auth.currentUser;
    await addMessage("general", {
      text: txt,
      userId: user.uid,
      displayName: user.displayName || "Anonymous",
      photoURL:
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.displayName || "User"
        )}`,
      createdAt: serverTimestamp(),
      reactions: {},
      replies: [],
    });
  });

  // ✅ Logout
  logoutBtn.addEventListener("click", () => {
    auth.signOut();
  });

  // ✅ Profile modal
  profileBtn.addEventListener("click", () => {
    profileModal.classList.add("show");
  });
  profileClose.addEventListener("click", () => {
    profileModal.classList.remove("show");
  });

  // ✅ Profile form save
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = profileName.value.trim();
    const avatar = profileAvatar.value.trim();
    const user = auth.currentUser;
    await updateProfileInfo(user, name, avatar);
    profileModal.classList.remove("show");
  });

  // ✅ Render Messages
  function renderMessages(docs) {
    messagesList.innerHTML = "";
    docs.forEach((docSnap) => {
      const msg = docSnap.data();
      const msgEl = document.createElement("div");
      msgEl.classList.add("message");

      msgEl.innerHTML = `
        <img class="avatar" src="${
          msg.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            msg.displayName || "User"
          )}`
        }" alt="">
        <div class="bubble">
          <div class="name">${escapeHtml(msg.displayName || "Anonymous")}</div>
          <div class="text">${linkify(escapeHtml(msg.text))}</div>
          <div class="actions">
            <button class="react-btn">👍</button>
            <button class="react-btn">❤</button>
            <button class="reply-btn">Reply</button>
          </div>
          <div class="reactions">
            ${renderReactions(msg.reactions)}
          </div>
          <div class="replies">
            ${renderReplies(msg.replies)}
          </div>
        </div>
      `;

      msgEl.querySelectorAll(".react-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await toggleReaction("general", docSnap.id, btn.textContent);
        });
      });

      msgEl.querySelector(".reply-btn").addEventListener("click", async () => {
        const replyText = prompt("Enter reply:");
        if (replyText) {
          await replyToMessage("general", docSnap.id, {
            text: replyText,
            userId: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || "Anonymous",
            photoURL:
              auth.currentUser.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                auth.currentUser.displayName || "User"
              )}`,
            createdAt: serverTimestamp(),
          });
        }
      });

      messagesList.appendChild(msgEl);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function renderReactions(reactions = {}) {
    const chips = [];
    Object.entries(reactions).forEach(([emoji, uids]) => {
      if (uids.length > 0) {
        chips.push(<span class="react-chip">${emoji} ${uids.length}</span>);
      }
    });
    return chips.join(" ");
  }

  function renderReplies(replies = []) {
    return replies
      .map(
        (r) => `
      <div class="reply">
        <img class="avatar" src="${
          r.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            r.displayName || "User"
          )}`
        }" alt="">
        <div class="bubble">
          <div class="name">${escapeHtml(r.displayName || "Anonymous")}</div>
          <div class="text">${escapeHtml(r.text)}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  // ✅ Render Conversations
  function renderConversations(users) {
    const list = document.getElementById("conversations");
    list.innerHTML = "";
    if (users.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No other users yet";
      list.appendChild(empty);
      return;
    }
    users.forEach((u) => {
      const el = document.createElement("div");
      el.classList.add("conversation");
      el.innerHTML = `
        <img class="avatar" src="${
          u.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            u.displayName || "User"
          )}`
        }" alt="">
        <div>
          <div class="name">${escapeHtml(u.displayName || "(no name)")}</div>
          <div class="email">${escapeHtml(u.email || "")}</div>
        </div>
      `;
      list.appendChild(el);
    });
  }

  // ✅ Utils
  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
    );
  }

  function linkify(text) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) =>
        <a href="${url}" target="_blank" rel="noopener">${url}</a>
    );
  }

  function dayKey(ts) {
    const d = ts.toDate();
    return ${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()};
  }
}
