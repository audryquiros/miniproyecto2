export const statements = [
  `CREATE TABLE IF NOT EXISTS colaboradores (
    id INT PRIMARY KEY AUTO_INCREMENT, nombre VARCHAR(120) NOT NULL, email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL, departamento VARCHAR(80) NOT NULL, puesto VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL, jefe_id INT NULL, rol ENUM('colaborador','RRHH') NOT NULL DEFAULT 'colaborador',
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo', proxima_evaluacion DATE,
    CONSTRAINT fk_jefe FOREIGN KEY(jefe_id) REFERENCES colaboradores(id))`,
  `CREATE TABLE IF NOT EXISTS sesiones (
    token_hash CHAR(64) PRIMARY KEY, colaborador_id INT NOT NULL, csrf_token CHAR(64) NOT NULL,
    expira_en DATETIME NOT NULL, creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS saldos_vacaciones (
    colaborador_id INT NOT NULL, periodo INT NOT NULL, dias_asignados DECIMAL(7,2) NOT NULL,
    dias_tomados DECIMAL(7,2) NOT NULL, dias_disponibles DECIMAL(7,2) NOT NULL,
    PRIMARY KEY(colaborador_id, periodo), FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id),
    CHECK(dias_disponibles >= 0))`,
  `CREATE TABLE IF NOT EXISTS solicitudes (
    id INT PRIMARY KEY AUTO_INCREMENT, colaborador_id INT NOT NULL,
    tipo ENUM('vacaciones','permiso') NOT NULL, fecha_inicio DATE NOT NULL, fecha_fin DATE NOT NULL,
    estado ENUM('pendiente','aprobada','rechazada') NOT NULL, aprobador_id INT,
    creada_en DATETIME NOT NULL, FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id),
    FOREIGN KEY(aprobador_id) REFERENCES colaboradores(id), CHECK(fecha_fin >= fecha_inicio),
    INDEX solicitudes_fechas(fecha_inicio,fecha_fin), INDEX solicitudes_estado(estado,creada_en))`,
  `CREATE TABLE IF NOT EXISTS incapacidades (
    id INT PRIMARY KEY AUTO_INCREMENT, colaborador_id INT NOT NULL, tipo VARCHAR(60) NOT NULL,
    fecha_inicio DATE NOT NULL, dias INT NOT NULL, entidad VARCHAR(60) NOT NULL,
    FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id), CHECK(dias > 0), INDEX(fecha_inicio))`,
  `CREATE TABLE IF NOT EXISTS movimientos_personal (
    id INT PRIMARY KEY AUTO_INCREMENT, colaborador_id INT NOT NULL,
    tipo ENUM('ingreso','salida','ascenso') NOT NULL, fecha DATE NOT NULL, motivo VARCHAR(200),
    FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id), INDEX(fecha))`,
  `CREATE TABLE IF NOT EXISTS calendario_pagos (fecha DATE PRIMARY KEY, concepto VARCHAR(100) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS consultas_chat (
    id BIGINT PRIMARY KEY AUTO_INCREMENT, colaborador_id INT NOT NULL, conversacion_id CHAR(36) NOT NULL,
    pregunta TEXT NOT NULL, respuesta TEXT NOT NULL, intencion VARCHAR(40) NOT NULL, agente VARCHAR(100) NOT NULL,
    documentos_citados JSON NOT NULL, fragmentos_usados JSON NOT NULL, resuelta BOOLEAN NOT NULL,
    escalada BOOLEAN NOT NULL, latencia_ms INT NOT NULL, tema VARCHAR(80) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(colaborador_id) REFERENCES colaboradores(id),
    INDEX consultas_usuario_conversacion(colaborador_id,conversacion_id,id),INDEX consultas_fecha(fecha))`,
  `CREATE TABLE IF NOT EXISTS reportes_diarios (
    id INT PRIMARY KEY AUTO_INCREMENT, fecha DATE NOT NULL UNIQUE, datos_json JSON NOT NULL,
    resumen_texto TEXT NOT NULL, generado_por VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS ejecuciones_programadas (
    tarea VARCHAR(80) NOT NULL, fecha DATE NOT NULL, completada_en DATETIME,
    PRIMARY KEY(tarea,fecha))`,
  `CREATE TABLE IF NOT EXISTS drive_sync_state (
    id INT PRIMARY KEY, page_token TEXT, ultima_sync DATETIME)`,
];
