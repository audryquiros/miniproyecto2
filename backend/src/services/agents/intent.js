export const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export function restricted(message) {
  return /companero|companera|gerente|otra persona|otro empleado|de juan|de maria|de pedro|todos los salarios|salarios de|datos de|contrasena|credencial|api.?key|clave privada|ignora.*instruccion|ignore.*instruction/.test(
    normalize(message),
  );
}
export function classifyRules(message) {
  const text = normalize(message);
  if (restricted(message)) return "RESTRINGIDA";
  if (
    /cuantas personas|cuantos colaboradores|reporte|rotacion|ausencias|dashboard|solicitudes pendientes/.test(
      text,
    )
  )
    return "REPORTE";
  const personal =
    /me quedan|mi saldo|mis vacaciones|mi.*solicitud|mi proxim[oa]|mi.*evaluacion|mis solicitudes|estado de mi/.test(
      text,
    );
  const policy =
    /politica|vacacion|feriado|permiso|licencia|incapacid|incapacit|teletrabajo|desde casa|jornada|horario|salario|pag[ao]|planilla|beneficio|onboarding|despido|despiden|salida|evaluacion|desempeno|conducta|denunci|privacidad|datos personales|diagnostico|aguinaldo|maternidad|paternidad|horas extra|prueba|preaviso|liquidacion|seguro medico|acoso|bono/.test(
      text,
    );
  if (personal && /acumular|pasar.*ano|politica|puedo|como.*solicit/.test(text))
    return "MIXTA";
  return personal ? "DATO_PERSONAL" : policy ? "POLITICA" : "FUERA_DE_ALCANCE";
}
