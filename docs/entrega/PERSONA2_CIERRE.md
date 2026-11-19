# Cuatro cambios de Persona 2

19 de noviembre de 2026. Solo resumen, resolución, reporte automático e informe técnico.

## Resumen

Groq redacta todas las frases. El código valida de tres a cinco, su indicador y etiqueta, y sustituye únicamente valores de SQL. No se aceptan cifras libres. El modo mock se identifica como plantilla. El resumen del reporte ya publicado no se reemplaza; el borrador nuevo se conserva en validacion-persona2.json.

## Resolución

Una cita válida no implica cobertura completa. La comprobación considera cada aspecto de la pregunta y exige evidencia literal para marcarlo completo. Si falta un aspecto o falla el juez, resuelta=false y escalada=true para revisión de RRHH; esto no crea un ticket. La respuesta visible conserva sus citas. El cálculo se aplica a consultas nuevas después de reiniciar el backend; no modifica automáticamente los logs ni reportes históricos. Puede infravalorar respuestas por fallo del proveedor. La verificación específica contiene seis parciales y tres completas de la evaluación existente.

## Reporte de las 7:00

Tarea Windows: Nuvexa-RRHH-Reporte-0700. Próxima ejecución: 20 de noviembre de 2026 a las 07:00 de Costa Rica. Equipo encendido y sesión del usuario iniciada; puede estar bloqueada. No depende del backend abierto. Una ejecución tras encender tarde el equipo queda registrada como tardía.

Evidencia real: backend/.cache/scheduler/2026-11-20-scheduled.json. Comprobar success=true, observedAtSeven=true y el reporte de esa fecha en el dashboard. El resultado todavía no existe: no se presenta como ya observado. La ejecución manual deja un archivo distinto y observedAtSeven=false.

Para revisar la tarea en PowerShell:

```powershell
Get-ScheduledTaskInfo -TaskName Nuvexa-RRHH-Reporte-0700
```

En otra computadora se registra desde backend con PowerShell (zona de Windows: Central America Standard Time). Revisar primero que no exista una tarea con el mismo nombre:

```powershell
$name = 'Nuvexa-RRHH-Reporte-0700'
if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) { throw 'La tarea ya existe.' }
$action = New-ScheduledTaskAction -Execute (Get-Command node.exe).Source -Argument 'scripts/scheduled-report.js' -WorkingDirectory (Get-Location).Path
$trigger = New-ScheduledTaskTrigger -Daily -At '07:00'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal
```

El registro se niega a sobrescribir una tarea existente. No lleva credenciales en sus argumentos. Para quitarla expresamente cuando ya no se necesite:

```powershell
Unregister-ScheduledTask -TaskName Nuvexa-RRHH-Reporte-0700
```

La prueba real de arranque desde el Programador de tareas terminó con código 0 a las 10:24 del 19 de noviembre. Reutilizó el reporte existente; no cuenta como generación nueva ni como observación a las 7:00. Ver scheduler-persona2.json. Windows bloqueó el lanzador PowerShell oculto inicial; la tarea ya no lo utiliza y ejecuta Node directamente, sin desactivar protecciones. El archivo register-report-task.ps1 quedó bloqueado por Windows y no se debe versionar ni ejecutar; su retirada debe hacerse desde Seguridad de Windows si permanece visible. El registro reproducible válido está en los comandos de esta guía.

## Informe y pruebas

El informe técnico incorpora los prompts reales, contratos de agentes sin LLM, chunking en palabras, criterio de resolución y límites de la evidencia. Se regenera exclusivamente el técnico con:

```powershell
python docs/entrega/actualizar_informe_persona2.py
python docs/entrega/generar_informes.py --technical-only
```

Desde backend: npm test, npm run test:integration y node scripts/verify-persona2.js. El último consume cuota de Groq y no vuelve a indexar Drive. La evaluación de cuarenta y cinco preguntas anterior conserva su fecha y métricas; no demuestra el tiempo de respuesta del código nuevo.
