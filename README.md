# Insumos Central Retiros · v2.2.1

## Preparaciones históricas privadas
- Importación por Excel `.xlsx` o CSV/TSV desde **Preparaciones anteriores** (solo administrador).
- Previsualización y validación antes de guardar. Cliente y código deben existir en el catálogo.
- Campos obligatorios: FECHA, CLIENTE, CODIGO, CANTIDAD. Opcionales: PRECIO UNITARIO, DOCUMENTO, PREPARADO POR, OBSERVACION.
- Si falta precio se usa el precio vigente **solo como estimación** y queda marcado como tal.
- Análisis por fecha, cliente, código e importe, exportación Excel, historial de lotes y anulación de un lote importado.
- **NO** altera stock, reservas, solicitudes ni el análisis de salidas aprobadas.
- Solo administradores pueden consultar/importar/anular este historial (RLS + RPC en Supabase).

## Publicación
Sube los **12 archivos** de este ZIP a la raíz de tu repositorio GitHub y en Render usa **Manual Deploy → Deploy latest commit** si el despliegue no inicia automáticamente.

### Seguridad
No compartas el historial importado con solicitantes. El contenido histórico y los importes solo se consultan mediante credenciales del administrador.


### Cambio v2.2.1
- El menú del computador tiene desplazamiento independiente cuando su contenido no cabe en la pantalla.
- Se añadió un acceso directo **Historial** en el encabezado de escritorio, que abre **Preparaciones anteriores**.
- No requiere cambios de Supabase ni recargar las 693 entregas históricas.
