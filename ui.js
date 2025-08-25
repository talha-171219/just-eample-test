// ui.js
import { auth } from "./firebase.js";
import {
  listenUsers,
  getOrCreateConversation,
  listenMessages as streamMessages,
  sendMessage,
  reactMessage as toggleReaction,
  markAsRead as markRead,
  REACTIONS,
  getUser
} from "./store.js";

// ---------- DOM SELECTORS ----------
const $ = (q) => document.querySelector(q);
const messagesEl = $("#messages");
const peopleList = $("#people-list");
const input = $("#input");
const sendBtn = $("#send");
const rpBox = $("#reply-preview");
const rpName = $("#rp-name");
const rpText = $("#rp-text");
const rpCancel = $("#rp-cancel");
const peerName = $("#peer-name");
const peerStatus = $("#peer-status");
const peerAvatar = $("#peer-avatar");
const themeToggle = $("#theme-toggle");

// ---------- STATE ----------
let peersUnsub = null;
let msgsUnsub = null;
let currentConvId = null;
let currentPeer = null;
let replyTo = null;

// ---------- INIT ----------
export function initUI() {
  setupTheme();
  bindComposer();
  bindReplyCancel();
  bindThemeToggle();
  loadPeople();
}

// ---------- THEME ----------
function setupTheme() {
  const pref = localStorage.getItem("theme") || "dark";
  document.documentElement.dataset.theme = pref;
  themeToggle.textContent = "Toggle theme";
  themeToggle.dataset.toggled = pref;
}
function bindThemeToggle() {
  themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
}

// ---------- COMPOSER ----------
function bindComposer() {
  input.addEventListener("input", autoResize);
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await doSend();
    }
  });
  sendBtn.addEventListener("click", doSend);
}
function bindReplyCancel() {
  rpCancel.addEventListener("click", () => {
    replyTo = null;
    rpBox.classList.add("hidden");
    rpText.textContent = "";
  });
}
async function doSend() {
  const text = input.value.replace(/\s+$/, "");
  if (!text) return;
  if (!currentPeer) {
    alert("Select someone from People to start chatting.");
    return;
  }
  await sendMessage(currentConvId, text, replyTo);
  replyTo = null;
  rpBox.classList.add("hidden");
  rpText.textContent = "";
  input.value = "";
  autoResize();
  scrollToBottom();
}
function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}

// ---------- PEOPLE LIST ----------
function loadPeople() {
  if (peersUnsub) peersUnsub();
  peersUnsub = listenUsers(renderPeople);
}
function renderPeople(list) {
  const me = auth.currentUser?.uid;
  const others = list.filter((u) => u.id !== me);
  peopleList.innerHTML = "";

  if (others.length === 0) {
    const empty = document.createElement("div");
    empty.className = "person";
    empty.innerHTML = <div>No other users yet</div>;
    peopleList.appendChild(empty);
    return;
  }

  for (const u of others) {
    const el = document.createElement("div");
    el.className = "person";
    el.innerHTML = `
      <img class="avatar" src="${u.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.displayName || "User")}" alt="">
      <div>
        <div class="name">${escapeHtml(u.displayName || "(no name)")}</div>
        <div class="email">${escapeHtml(u.email || "")}</div>
      </div>
    `;
    el.addEventListener("click", () => openChat(u));
    peopleList.appendChild(el);
  }
}

// ---------- CHAT ----------
async function openChat(peer) {
  currentPeer = peer;
  peerName.textContent = peer.displayName || "(no name)";
  peerStatus.textContent = peer.email || "";
  peerAvatar.src =
    peer.photoURL ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(peer.displayName || "User");

  currentConvId = await getOrCreateConversation(peer.uid);
  if (msgsUnsub) msgsUnsub();
  msgsUnsub = streamMessages(currentConvId, renderMessages);
  setTimeout(() => markRead(currentConvId), 300);
}

// ---------- MESSAGES ----------
function renderMessages(msgs) {
  messagesEl.innerHTML = "";
  const me = auth.currentUser?.uid;
  let lastDayKey = null;

  for (const m of msgs) {
    const created = m.createdAt ? m.createdAt.toDate() : null;
    const day = dayKey(created);
    if (day !== lastDayKey) {
      lastDayKey = day;
      const sep = document.createElement("div");
      sep.className = "day-sep";
      sep.textContent = labelForDay(day);
      messagesEl.appendChild(sep);
    }

    const el = document.createElement("div");
    el.className = "msg " + (m.senderUid === me ? "me" : "other");

    const replyHtml = m.replyTo
      ? <div class="reply-quote">${escapeHtml(m.replyTo.text || "")}</div>
      : "";

    el.innerHTML = `
      <div class="react-bar">${REACTIONS.map(
        (e) => <span class="react-btn">${e}</span>
      ).join("")}</div>
      ${replyHtml}
      <div class="body">${linkify(escapeHtml(m.text || ""))}</div>
      <div class="meta">
        <span class="time">${formatTime(created)}</span>
        <button class="reply-btn" title="Reply">Reply</button>
      </div>
      <div class="reacts-view">${renderReacts(m.reactions || {})}</div>
    `;

    // reactions
    el.querySelectorAll(".react-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        toggleReaction(currentConvId, m.id, btn.textContent)
      );
    });

    // reply
    el.querySelector(".reply-btn").addEventListener("click", async () => {
      replyTo = m;
      rpBox.classList.remove("hidden");
      const sender =
        (await getUser(m.senderUid))?.displayName || "User";
      rpName.textContent = sender;
      rpText.textContent = (m.text || "").slice(0, 160);
      input.focus();
    });

    messagesEl.appendChild(el);
  }
  scrollToBottom();
}
function renderReacts(reactions) {
  const chips = [];
  for (const [emoji, uids] of Object.entries(reactions)) {
    if (!uids || uids.length === 0) continue;
    chips.push(
      <span class="react-chip">${emoji} ${uids.length}</span>
    );
  }
  return chips.join("");
}
function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ---------- HELPERS ----------
function dayKey(d) {
  if (!d) return "unknown";
  return ${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()};
}
function labelForDay(key) {
  return key === dayKey(new Date()) ? "Today" : key;
}
function formatTime(d) {
  if (!d) return "...";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
      c
    ])
  );
}
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    (url) =>
      <a href="${url}" target="_blank" rel="noopener">${url}</a>
  );
}
