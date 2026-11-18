# Insumos Central Retiros v1.9 — Consumo y costos

## Nuevo módulo: Consumo y costos (solo administrador)
- Navegación: **Consumo y costos**, también desde los accesos rápidos del Inicio y el menú Más en el móvil.
- Analiza aprobaciones de los últimos **7, 30, 90 o 365 días**, con filtro por cliente.
- Costo total CLP y comparación con el período anterior de igual duración.
- Aprobaciones, clientes atendidos y número de líneas despachadas.
- Evolución diaria (7 días), semanal (30/90) o mensual (365), sin inventar valores donde no hay datos.
- Costo por cliente y ranking por insumo con cantidad/unidad, precio medio ponderado y costo.
- Exportación a **Excel real de 4 hojas**: Resumen, Clientes, Insumos y Evolucion.
- Aviso si alguna salida aprobada tiene precio $0 o no tiene precio histórico.
- Se calculan las salidas **aprobadas**, no solicitudes pendientes ni entregas físicas confirmadas.
- Se preserva el precio unitario capturado al aprobar cada salida; editar precios actuales no reescribe el histórico.

## Backend
Supabase ya incorpora la función segura `admin_consumption_analytics` (permisos admin; otros perfiles rechazados). Los cálculos se realizan en base de datos e incluyen todos los registros del período, no solo los primeros pedidos que aparecen en el listado de la interfaz. Las comparaciones y los días utilizan la zona horaria America/Santiago. No se alteran pedidos, stock, usuarios, clientes ni permisos existentes.

Si no hay insumos y salidas aprobadas, el panel se mostrará correctamente vacío. No se crean datos ficticios.

## Publicación
1. Descomprimir el ZIP y subir **los 11 archivos internos** a la raíz del repositorio `KvinEspinoza555/insumos-central-retiros`, reemplazando los anteriores.
2. Hacer **Commit changes**.
3. Render > servicio Insumos Central Retiros > **Manual Deploy → Deploy latest commit** si no se publicó solo.
4. Abrir la app cuando Render muestre **Live**, idealmente cerrar y reabrir en iPhone para actualizar caché.

**Versión:** 1.9.0
