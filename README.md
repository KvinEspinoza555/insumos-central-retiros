# Insumos Central Retiros v1.8 — Alertas y conteos físicos

## Novedades

**Alertas (solo administrador)**
- Solicitudes pendientes y pendientes desde hace más de 24 horas.
- Insumos agotados y con stock disponible menor o igual al mínimo configurado en Insumos.
- Consumo inusual: últimos 7 días superiores a dos veces el promedio semanal de los 28 días anteriores. Solo si existe historial suficiente (al menos 4 unidades en ambos períodos).
- Indicador de alerta en Inicio, botón de campana y nueva pantalla Alertas. Se actualiza al abrir/refrescar la app; **no** envía notificaciones push ni correos.

**Inventario físico (solo administrador)**
- Inventario → Contar o Nuevo conteo.
- Compara stock registrado, unidades reservadas y cantidad física contada.
- Exige una observación; registra fecha, administrador y diferencia, incluso si coincide el conteo.
- Ajusta automáticamente existencias **solo por la diferencia**, dejando movimiento de stock.
- Nunca permite reducir por debajo de reservas y rechaza el ajuste si otro movimiento modificó el stock desde que se abrió el formulario.
- Historial de los últimos 150 conteos, solo en administración.

## Datos y seguridad

La base de datos de Supabase ya fue actualizada con `inventory_counts`, `admin_record_inventory_count` y `admin_supply_alerts`; no vuelvas a ejecutar ninguna migración manual. La información de precios permanece limitada al administrador. No se modificaron los usuarios, contraseñas, ID, clientes ni las solicitudes existentes. Las pruebas de base de datos se revirtieron con `ROLLBACK`.

La detección de consumo inusual compara salidas aprobadas, no las solicitudes pendientes. Si aún no existen insumos o historial, las alertas mostrarán un estado vacío.

## Publicar en GitHub / Render

1. Descomprimir el ZIP y subir **los 11 archivos internos** a la raíz de `KvinEspinoza555/insumos-central-retiros` (no subir el ZIP), reemplazando los anteriores.
2. Guardar con **Commit changes**.
3. En Render, si no se despliega automáticamente, seleccionar **Manual Deploy → Deploy latest commit**.
4. Al estar `Live`, volver a abrir la app o recargarla.

**Versión:** 1.8.0
