import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

function appendMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function botReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes("reminder")) return "🕒 Don't forget to take breaks!";
  if (lower.includes("tip")) return "💡 Try the Pomodoro technique!";
  if (lower.includes("motivation")) return "🚀 You’ve got this! Keep pushing!";
  return "🤖 I'm here to help with productivity tips!";
}

window.sendMessage = async function () {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";

  const reply = botReply(text);
  appendMessage(reply, "bot");

  try {
    await addDoc(collection(db, "messages"), {
      user: text,
      bot: reply,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Error saving to Firestore", e);
  }
};
