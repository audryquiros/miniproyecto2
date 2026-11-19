"""Prepara versiones académicas locales. No escribe ni cambia permisos en Drive."""
from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[2]
folder=root/'docs/politicas'
manifest=[]
for path in sorted(folder.glob('[0-9][0-9]_*.txt')):
    text=path.read_text(encoding='utf-8').replace('\r\n','\n')
    if 'Versión: 1.1' not in text:
        text=text.replace('NUVEXA SOLUTIONS','NUVEXA SOLUTIONS\nVersión: 1.1\nVigencia: 2026-11-19\nResponsable: Equipo de Recursos Humanos de Nuvexa (empresa ficticia)\nÁmbito: proyecto académico; la aplicación a casos reales requiere revisión del régimen correspondiente.',1)
    if path.name.startswith('01_') and 'Calendario académico 2026' not in text:
        text=text.replace('8. Registro','Calendario académico 2026 (fuente: MTSS, CARTA-MTSS-DAJ-AER-1076-2025): 1 de enero; 2 y 3 de abril; 11 de abril; 1 de mayo; 25 de julio; 2, 15 y 31 de agosto; 15 de septiembre; 1 y 25 de diciembre. Para una consulta posterior al 19 de noviembre de 2026, quedan 1 de diciembre y 25 de diciembre. Para otro año se debe cargar el calendario oficial correspondiente; no se reutilizan estas fechas automáticamente.\n\n8. Registro')
    if path.name.startswith('02_'):
        text=text.replace('hasta 3 días por hermano; y 1 día por abuelo, nieto o suegro.','hasta 3 días por hermano o suegro; y 1 día por abuelo o nieto. La licencia nunca será inferior al mínimo aplicable de la Ley 10589 (artículo 69 inciso l): tres días hábiles para primer grado de consanguinidad o afinidad y un día para segundo y tercer grado, sin perjuicio de normas especiales. Fuente: https://direccionejecutiva.poder-judicial.go.cr/index.php/servicios/edictos/72-publicados-en-el-diario-oficial-la-gaceta-segun-articulos-81-y-172?download=426%3Adel-18-al-22-de-noviembre-2024-alcance-195-gaceta-227-del-03-de-diciembre-2024&start=60')
        text=text.replace('Nuvexa aplicará la licencia de paternidad establecida por la legislación costarricense vigente y mantendrá el procedimiento actualizado ante cambios normativos.','En el supuesto de paternidad del artículo 95 inciso b), corresponden dos días por semana durante las primeras cuatro semanas desde el nacimiento. La nota constitucional incorporada por SINALEVI extiende este beneficio a la madre no gestante que ejerza comaternidad en una familia homoparental. RRHH verificará los supuestos y respaldos del caso. Fuente: artículo 95 vigente, https://www.pgrweb.go.cr/DOCS/NORMAS/1/VIGENTE/L/1940-1949/1940-1944/1943/1F6D/180E63.HTML')
    if path.name.startswith('07_'):
        text=text.replace('La relación laboral y cualquier período de prueba se regirán por el contrato y la legislación costarricense aplicable.','Para relaciones por tiempo indefinido se distinguirá el umbral de tres meses relacionado con preaviso y cesantía del plazo de inducción interna. No se entenderá que los primeros 90 días eliminan derechos, salario, seguridad social ni protecciones especiales. RRHH revisará el contrato y cualquier excepción; el sistema no resolverá automáticamente la legalidad de un despido. Fuente: Código de Trabajo, artículos 28 y 29, y consultas laborales del MTSS.')
        text=text.replace('El preaviso se determinará según la antigüedad y la legislación aplicable.','En contratos por tiempo indefinido, el artículo 28 establece una semana desde tres hasta seis meses de servicio; quince días para más de seis meses y hasta un año; un mes después de un año. RRHH debe verificar la antigüedad y las condiciones del caso antes de aplicar el plazo. Fuente: https://www.mtss.go.cr/elministerio/estructura/direccion-asuntos-juridicos/criterios_juridicos/documetos/DAJ-AER-OFP-758-2023.pdf')
    if path.name.startswith('03_') and 'Ejemplo de cinco días' not in text:
        text=text.replace('5. Riesgo de trabajo','Ejemplo de cinco días: antes de calcular un importe se debe identificar si la boleta corresponde a enfermedad común o riesgo laboral, la entidad emisora, continuidad con otras incapacidades y la base de cálculo. La empresa no promete salario completo ni aplica el beneficio de duelo a una incapacidad. Si no constan los parámetros y las reglas vigentes del régimen, se deriva el cálculo a RRHH y al ente asegurador; no se inventa un porcentaje universal.\n\n5. Riesgo de trabajo')
    path.write_text(text,encoding='utf-8')
    manifest.append({'archivo':path.name,'version':'1.1','vigencia':'2026-11-19','responsable':'Equipo RRHH Nuvexa (ficticio)','sha256':hashlib.sha256(text.encode()).hexdigest(),'publicacion_drive':'pendiente de publicación por el equipo'})
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Diez políticas locales preparadas. Drive no fue modificado.')
