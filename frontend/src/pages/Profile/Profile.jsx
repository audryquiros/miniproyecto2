import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
export default function Profile() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/personnel/me")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="workspace">
      <p className="eyebrow">MI ESPACIO</p>
      <h1>Mi perfil</h1>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Cargando tu información…</p>
      ) : (
        <>
          <h2>{data.nombre}</h2>
          <p>
            {data.puesto} · {data.departamento}
          </p>
          <div className="metrics">
            <article>
              <span>Vacaciones disponibles</span>
              <strong>
                {data.saldos[0]?.dias_disponibles ?? "Sin registro"}
              </strong>
              <small>Días · período {data.saldos[0]?.periodo ?? "—"}</small>
            </article>
            <article>
              <span>Próximo pago</span>
              <strong className="date-value">
                {data.proximo_pago?.fecha ?? "Sin programar"}
              </strong>
            </article>
            <article>
              <span>Próxima evaluación</span>
              <strong className="date-value">
                {data.proxima_evaluacion ?? "Sin programar"}
              </strong>
            </article>
          </div>
          <h2>Mis solicitudes</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Solicitud</th>
                  <th>Tipo</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.solicitudes.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.tipo}</td>
                    <td>{r.fecha_inicio}</td>
                    <td>{r.fecha_fin}</td>
                    <td>
                      <span className={"badge " + r.estado}>{r.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.solicitudes.length && (
              <p>No tienes solicitudes registradas.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
