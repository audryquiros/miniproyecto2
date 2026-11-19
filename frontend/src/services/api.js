const API_URL = import.meta.env.VITE_API_URL || "/api";
let csrfToken = "";
let conversationId = null;
export function resetConversation() {
  conversationId = null;
}
export async function api(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(data.message || "No se pudo completar la operación.");
  }
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}
export async function login(email, password) {
  await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return api("/auth/me");
}
export async function logout() {
  await api("/auth/logout", { method: "POST" });
  csrfToken = "";
  resetConversation();
}
export async function sendMessage(message) {
  const result = await api("/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  });
  conversationId = result.conversationId;
  return result;
}
