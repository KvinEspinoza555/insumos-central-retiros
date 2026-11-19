# Insumos Central Retiros · v2.4.0

## Preparaciones históricas privadas
- Importación por Excel `.xlsx` o CSV/TSV desde **Preparaciones anteriores** (solo administrador).
- Previsualización y validación antes de guardar. Cliente y código deben existir en el catálogo.
- Campos obligatorios: FECHA, CLIENTE, CODIGO, CANTIDAD. Opcionales: PRECIO UNITARIO, DOCUMENTO, PREPARADO POR, OBSERVACION.
- Si falta precio se usa el precio vigente **solo como estimación** y queda marcado como tal.
- Análisis por fecha, cliente, código e importe, exportación Excel, historial de lotes y anulación de un lote importado.
- **NO** altera stock, reservas, solicitudes ni el análisis de salidas aprobadas.
- Solo administradores pueden consultar/importar/anular este historial (RLS + RPC en Supabase).

## Publicación
Sube los **13 archivos** de este ZIP a la raíz de tu repositorio GitHub y en Render usa **Manual Deploy → Deploy latest commit** si el despliegue no inicia automáticamente.

### Seguridad
No compartas el historial importado con solicitantes. El contenido histórico y los importes solo se consultan mediante credenciales del administrador.


### Cambio v2.3.0
- El menú del computador tiene desplazamiento independiente cuando su contenido no cabe en la pantalla.
- Se añadió un acceso directo **Historial** en el encabezado de escritorio, que abre **Preparaciones anteriores**.
- No requiere cambios de Supabase ni recargar las 693 entregas históricas.


### Nuevo en v2.3.0 · Análisis avanzado (solo administrador)
- Comparación mensual y porcentaje de cambio entre meses calendario completos consecutivos.
- Ranking de clientes con porcentaje del valor total y tabla de clientes por mes.
- Evolución por insumo (valor CLP, cantidad y precio promedio), con filtro por SKU.
- Oportunidades de revisión basadas en concentración del valor, variaciones mensuales y precio registrado.
- Exportación Excel ampliada con hojas «Comparacion mensual», «Clientes por mes» e «Insumos por mes».
- Los filtros existentes de período y cliente aplican también a los análisis nuevos.
- Meses parciales se señalan y excluyen de comparaciones porcentuales.
- El cálculo se basa solo en preparaciones históricas. No suma las solicitudes aprobadas ni modifica el inventario.
- Requiere función Supabase pública de acceso exclusivo al administrador `admin_prepared_history_insights`, ya desplegada directamente.

**Importante:** La variación del gasto no representa un ahorro verificado; para ello faltan volúmenes de paquetes procesados y estándares óptimos por cliente.

### Nuevo en v2.4.0 · Instalación desde la página web
- Al entrar por el navegador, aparece un panel **«Instalar Insumos Central Retiros»**, incluso antes de iniciar sesión.
- En Chrome/Edge compatibles, el botón activa el diálogo nativo de instalación de la PWA.
- En Safari de iPhone/iPad y navegadores sin diálogo nativo, muestra instrucciones específicas para **Compartir → Agregar a inicio**.
- En Safari de macOS indica **Archivo → Agregar al Dock**; en Android explica el menú de Chrome si no aparece la instalación directa.
- Si se elige «Ahora no», la invitación se repliega en un botón visible «Instalar app»; la invitación grande se puede mostrar de nuevo 7 días después.
- Si la app está instalada y se abre como aplicación, no muestra la invitación.
- La app sigue siendo una PWA; no requiere App Store ni Play Store.
- Incorpora archivo `install-pwa.js` en el caché de la PWA y actualiza la versión del caché a 2.4.
- Incluye todas las mejoras de la 2.3, aunque todavía no se haya publicado. No modifica los datos de Supabase ni requiere migraciones.
