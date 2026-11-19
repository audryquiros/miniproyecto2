export function errorHandler(error, _req, res, _next) {
  console.error({
    name: error.name,
    code: error.code,
    status: error.status || 500,
  });

  res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : "No se pudo completar la operación. Revisa la configuración del servidor o contacta a RRHH.",
  });
}
