import Citation from "../Citation/Citation.jsx";

export default function Message({ item }) {
  return (
    <article className={`message ${item.role}`}>
      <div className="message-bubble">
        <p>{item.content}</p>

        {item.citations?.length > 0 && (
          <div className="citations">
            <span className="citation-title">Fuentes</span>
            {item.citations.map((citation, index) => (
              <Citation key={index} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
