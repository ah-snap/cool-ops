/* global chrome */
const DEFAULT_BASE_URL = "http://localhost:5173";

const input = document.getElementById("baseUrl");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

function normalize(value) {
  if (!value) return DEFAULT_BASE_URL;
  return String(value).trim().replace(/\/$/, "");
}

async function load() {
  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });
  input.value = baseUrl;
}

async function save() {
  const normalized = normalize(input.value);
  await chrome.storage.sync.set({ baseUrl: normalized });
  input.value = normalized;
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 1500);
}

saveBtn.addEventListener("click", save);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") save();
});

load();
