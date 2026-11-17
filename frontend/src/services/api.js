const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function sendMessage(message) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo procesar la consulta.");
  }

  return data;
}
