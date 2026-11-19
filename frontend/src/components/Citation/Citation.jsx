export default function Citation({ citation }) {
  const sections = citation.sections?.length
    ? citation.sections.join(" · ")
    : citation.section || "Documento completo";
  return (
    <div className="citation">
      <strong>{citation.document}</strong>
      <span>{sections} · versión {citation.version || "vigente"}</span>
      {citation.url && (
        <a href={citation.url} target="_blank" rel="noreferrer">
          Ver fuente
        </a>
      )}
    </div>
  );
}
