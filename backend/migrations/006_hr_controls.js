export const statements = [
  `ALTER TABLE sanciones_asistencia
     ADD COLUMN origen ENUM('manual','automatica') NOT NULL DEFAULT 'manual' AFTER estado`,
  `ALTER TABLE sanciones_asistencia
     ADD COLUMN anulada_por INT NULL AFTER creada_en`,
  `ALTER TABLE sanciones_asistencia
     ADD COLUMN anulada_en DATETIME NULL AFTER anulada_por`,
  `ALTER TABLE sanciones_asistencia
     ADD COLUMN motivo_anulacion VARCHAR(500) NULL AFTER anulada_en`,
  `ALTER TABLE sanciones_asistencia
     ADD CONSTRAINT fk_sancion_anulada_por FOREIGN KEY (anulada_por) REFERENCES colaboradores(id) ON DELETE SET NULL`,
];
