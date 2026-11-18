export default function Citation({ citation }) {
  return (
    <div className="citation">
      <strong>
        {citation.sourceId ? `Fuente ${citation.sourceId} · ` : ""}
        {citation.document}
      </strong>
      <span>
        {citation.section} · versión {citation.version}
      </span>
      {citation.url && (
        <a href={citation.url} target="_blank" rel="noreferrer">
          Ver fuente
        </a>
      )}
    </div>
  );
}
