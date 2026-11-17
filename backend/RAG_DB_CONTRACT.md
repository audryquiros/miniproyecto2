# Contrato de BD para el módulo RAG

La creación y administración de la base de datos MySQL pertenece al bloque de backend/BD del compañero. Este módulo NO crea migraciones ni tablas por su cuenta.

Para que el módulo RAG funcione, la BD final debe incluir estas tablas:

## policy_documents

- `id` INT PK AUTO_INCREMENT
- `drive_file_id` VARCHAR(255) UNIQUE
- `document_name` VARCHAR(500) NOT NULL
- `version` VARCHAR(50) NOT NULL
- `effective_date` DATE NULL
- `drive_url` TEXT NULL
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

## policy_chunks

- `id` INT PK AUTO_INCREMENT
- `document_id` INT NOT NULL, FK → `policy_documents.id`
- `document_name` VARCHAR(500) NOT NULL
- `section` VARCHAR(500) NULL
- `version` VARCHAR(50) NOT NULL
- `effective_date` DATE NULL
- `drive_file_id` VARCHAR(255) NULL
- `drive_url` TEXT NULL
- `chunk_index` INT NOT NULL
- `chunk_text` LONGTEXT NOT NULL
- `embedding` JSON NULL
- `created_at` TIMESTAMP

Relación:
`policy_documents 1 ─── N policy_chunks`

El módulo RAG solamente consume estas tablas mediante `src/config/database.js`; no ejecuta CREATE TABLE.

## Integración con el backend general

El compañero puede incorporar estas tablas a su esquema/migraciones MySQL general. No debe ser necesario mantener una migración independiente dentro de este módulo.
