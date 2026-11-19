import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import Message from "../Message/Message.jsx";
import { sendMessage } from "../../services/api.js";
import "./ChatBubble.css";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const chatRef = useRef(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hola. Soy el asistente de Nuvexa. Puedes preguntarme sobre vacaciones, permisos, teletrabajo, beneficios y otras políticas de RR. HH." },
  ]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event) {
      if (chatRef.current && !chatRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const value = message.trim();
    if (!value || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setMessage("");
    setLoading(true);
    try {
      const result = await sendMessage(value);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, citations: result.citations }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Ocurrió un error: ${error.message}` }]);
    } finally { setLoading(false); }
  }

  return (
    <div ref={chatRef} className="chat-widget-root">
      {open && (
        <section className="chat-popover" aria-label="Asistente de Nuvexa">
          <header className="chat-popover-header">
            <div className="chat-popover-title">
              <span className="chat-avatar"><Bot size={18} /></span>
              <div><strong>Asistente Nuvexa</strong><small>Políticas de RR. HH.</small></div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X size={18} /></button>
          </header>
          <div className="chat-popover-messages">
            {messages.map((item, index) => <Message key={index} item={item} />)}
            {loading && <div className="message assistant"><div className="message-bubble typing">Consultando las políticas…</div></div>}
          </div>
          <form className="chat-popover-composer" onSubmit={handleSubmit}>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe tu pregunta..." aria-label="Pregunta al asistente" maxLength={2000} disabled={loading} />
            <button type="submit" disabled={loading || !message.trim()} aria-label="Enviar pregunta"><Send size={17} /></button>
          </form>
        </section>
      )}
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Abrir asistente de Nuvexa" aria-expanded={false}>
          <MessageCircle size={24} />
          <span className="chat-fab-label">Asistente Nuvexa</span>
        </button>
      )}
    </div>
  );
}
