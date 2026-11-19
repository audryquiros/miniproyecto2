import { Bot, UserRound } from "lucide-react";
import Citation from "../Citation/Citation.jsx";
import "./Message.css";

function groupCitations(citations = []) {
  const groups = new Map();
  for (const citation of citations) {
    const key = `${citation.document}|${citation.version || ""}|${citation.url || ""}`;
    const current = groups.get(key) || { ...citation, sections: [] };
    if (citation.section && !current.sections.includes(citation.section)) current.sections.push(citation.section);
    groups.set(key, current);
  }
  return [...groups.values()];
}

export default function Message({ item }) {
  const cleanContent = item.content?.replace(/\s*\[Fuente\s+\d+\]/g, "");
  const citations = groupCitations(item.citations);
  const isUser = item.role === "user";

  return (
    <article className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="message-meta">
        <span className="message-role-icon">
          {isUser ? <UserRound size={13} /> : <Bot size={13} />}
        </span>
        <span>{isUser ? "Tú" : "Asistente Nuvexa"}</span>
      </div>

      <div className="message-bubble">
        <p>{cleanContent}</p>
        {citations.length > 0 && (
          <div className="citations">
            <span className="citation-title">Fuentes</span>
            {citations.map((citation, index) => (
              <Citation key={`${citation.document}-${index}`} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
