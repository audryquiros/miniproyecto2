import { useState } from "react";
import { Send } from "lucide-react";
import Message from "../Message/Message.jsx";
import { sendMessage } from "../../services/api.js";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hola. Soy el asistente de políticas de Nuvexa. Puedes preguntarme sobre vacaciones, permisos, teletrabajo, beneficios y otras políticas de RR. HH."
    }
  ]);

  async function handleSubmit(event) {
    event.preventDefault();

    const value = message.trim();
    if (!value || loading) return;

    setMessages(prev => [...prev, { role: "user", content: value }]);
    setMessage("");
    setLoading(true);

    try {
      const result = await sendMessage(value);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          citations: result.citations
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Ocurrió un error: ${error.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat">
      <div className="chat-header">
        <div>
          <h1>Asistente de RR. HH.</h1>
          <p>Consulta las políticas internas de Nuvexa.</p>
        </div>
        <span className="status">● En línea</span>
      </div>

      <div className="messages">
        {messages.map((item, index) => (
          <Message key={index} item={item} />
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-bubble">Consultando las políticas...</div>
          </div>
        )}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={message}
          onChange={event => setMessage(event.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !message.trim()}>
          <Send size={18} />
          Enviar
        </button>
      </form>
    </section>
  );
}
