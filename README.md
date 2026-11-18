# Insumos Central Retiros v1.7 — Administrador también solicita

## Mejora
- El administrador puede crear solicitudes desde **Solicitar**, igual que un solicitante.
- La solicitud se registra a nombre del administrador, queda pendiente y reserva stock.
- El administrador mantiene acceso a aprobaciones, inventario, insumos, clientes, personal, reportes y PDF de salida.
- Acceso rápido **Solicitar insumos** en Inicio.
- La barra inferior de celular incluye **Solicitar** y el menú **Más** conserva Personal, Clientes, Insumos y Reportes.
- La vista de Solicitudes muestra **Nueva solicitud** al administrador.

## Incluye también las mejoras anteriores
- Login por ID y PIN de cuatro dígitos para solicitantes.
- Comprobante PDF A4 en blanco y negro, sin firmas.

## Publicación
Descomprime el ZIP y sube sus 11 archivos a la raíz de GitHub `KvinEspinoza555/insumos-central-retiros`, reemplazando los anteriores. Confirma con **Commit changes**. Si Render no despliega automáticamente, ejecuta **Manual Deploy → Deploy latest commit**.

## Notas
- No requiere migraciones adicionales ni cambiar el rol del administrador. La función `submit_order` ya admite usuarios administradores activos.
- Solo puede enviarse una solicitud cuando existen insumos con stock disponible.
- La solicitud del administrador queda pendiente y se tramita desde **Solicitudes** como cualquier otra solicitud.
- No subas a GitHub la planilla con ID/PIN de los trabajadores.
