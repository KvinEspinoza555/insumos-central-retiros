# Insumos Central Retiros · v1.4 FLUID

Diseño alternativo a las tarjetas cuadradas: cabecera de formas orgánicas, medidor circular, métricas abiertas, accesos tipo cápsula y navegación móvil flotante. Incluye todas las funciones de la v1.3, incluido login por ID.

Esta actualización cambia la apariencia visual; no recrea la base de datos ni modifica las reglas de inventario, solicitudes o precios. Las URLs de Supabase y la clave publicable están en `config.js`. No incluya claves secretas.

## Publicación
1. Descomprima el ZIP.
2. En GitHub, `KvinEspinoza555/insumos-central-retiros` > Add file > Upload files.
3. Suba los 10 archivos de esta carpeta a la raíz (no el ZIP), reemplazando las versiones anteriores.
4. Haga Commit changes. Render está configurado para publicar desde main; si no detecta el cambio, elija Manual Deploy > Deploy latest commit.
5. Abra la app con recarga sin caché. Si estaba instalada, cierre y reabra o reinstale cuando sea necesario.

## Notas importantes
- Los usuarios ingresan con su ID numérico y contraseña. El administrador que aún no tenga ID puede usar la opción de configuración inicial y asignárselo desde Personal.
- La seguridad real se aplica en la base de datos, mediante RLS y funciones de Supabase. La apariencia no otorga nuevos permisos.
- El acceso por ID y la creación de personal usan Edge Functions ya desplegadas en el proyecto Supabase existente.
- Antes de ingresar datos laborales sensibles, probar el flujo solicitante -> administrador -> aprobación/rechazo.
- Capturas de vista previa con contenido ficticio; no representan información real.
