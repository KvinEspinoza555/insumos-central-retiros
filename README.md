# Insumos Central Retiros — Versión conectada 1.1

**Estado:** Supabase ya fue creado y se instalaron las tablas, las funciones y sus políticas RLS. El sitio web original en Render conserva la versión anterior hasta que se suban los archivos de este paquete a GitHub.

## Alojamiento gratuito

- Web (Render Static Site): https://insumos-central-retiros.onrender.com
- Base de datos Supabase: `bvyfkxnqkcwhssyznabw` (São Paulo), proyecto Free
- Repo GitHub: https://github.com/KvinEspinoza555/insumos-central-retiros
- API: únicamente clave **publicable** en `config.js`. Nunca publicar secretos ni claves `service_role`.

## Ya está implementado

- PWA instalable en Safari iOS, Chrome Android y navegadores de escritorio compatibles.
- Autenticación por email y contraseña, con registro inicial y gestión de usuarios.
- Administrador añade clientes, insumos, stock y cuentas de trabajadores desde el sistema.
- Cuenta de trabajador creada automáticamente mediante una función del servidor, con contraseña temporal segura entregada al administrador y opción de cambiar contraseña desde el perfil.
- Solicitar reserva stock inmediatamente y el servidor bloquea intentos que excedan existencias. Una aprobación confirma salida (sin descontar dos veces), un rechazo libera reserva.
- Precios en tablas protegidas, solo para administrador. PDF sin importes. Excel semanal con precio y costo para administrador.
- Listados sincronizados usando Realtime más actualizaciones periódicas.

## Publicar en Render (única actualización pendiente)

1. **NO borres el repositorio.** Usa la misma dirección GitHub anterior.
2. En Safari del celular o desde PC, abre tu repositorio > **Add file → Upload files**.
3. Sube los archivos de este ZIP **descomprimidos en la raíz**, reemplazando los existentes: `index.html`, `app.js`, `styles.css`, `config.js`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`, `_headers` y `README.md`.
4. Pulsa **Commit changes**. El alojamiento Render ya tiene autoDeploy y publicará el commit sin contratar otro servicio.
5. Prueba la web en una pestaña privada; si aparece un diseño anterior, refresca o reinstala la PWA.

## Primer administrador

**Antes de registrar la primera cuenta**, en Supabase Dashboard > Authentication > URL Configuration, configura:
- Site URL: `https://insumos-central-retiros.onrender.com`
- Redirect URLs: agrega `https://insumos-central-retiros.onrender.com/**`

Mantén **Confirm email** activado en Authentication > Providers > Email.

1. Abre la app nueva desde la web y usa **Primera configuración: crear cuenta de administrador**.
2. Regístrate con un email que sea **miembro de la organización Supabase** (para que pueda recibir el correo de confirmación gratuito). Usa una contraseña exclusiva. **No compartas esa contraseña en ChatGPT**.
3. Abre el email de confirmación, confirma el correo y vuelve a la app. El acceso quedará **pendiente** inicialmente (diseño intencional).
4. En el SQL Editor, una vez comprobada la confirmación del correo, un administrador del proyecto debe ejecutar **una sola vez**:

```sql
update public.profiles p
set role='admin', active=true
from auth.users u
where p.id=u.id and u.email_confirmed_at is not null
  and lower(u.email)=lower('CORREO-ADMIN-CONFIRMADO@EJEMPLO.COM');
```

**Importante:** reemplaza ese email solo después de verificar que sea el del propietario real. También puedo efectuar esta activación por el conector una vez que me confirmes el email con el que te registraste. Nunca me envíes la contraseña.

5. Inicia sesión nuevamente. En **Personal > Añadir personal** ingresa nombre, correo y perfil. La cuenta se crea en ese momento; copia la contraseña temporal y entrégala de forma privada. El trabajador entra y pulsa **Cambiar contraseña**.
6. Agrega clientes e insumos reales y registra stock inicial desde la app. Al principio todo está vacío.
7. Prueba con cuentas diferentes: solicita 2 unidades en celular de trabajador y verifica desde la cuenta admin en PC; aprueba o rechaza y revisa inventario.

## Seguridad y límites

- La función Edge `create-staff-account` comprueba el JWT de usuario y que el perfil sea administrador activo antes de usar claves secretas almacenadas **solo en Supabase**.
- La dirección web y clave publicable son normales en clientes web y **no** permiten leer tablas con datos privados sin autorización por RLS.
- No se asignan permisos desde `user_metadata` del usuario.
- El correo de salida **predeterminado** de Supabase solo envía a emails de miembros de tu organización (y posee límites muy bajos). Las cuentas del personal creadas desde la app **no necesitan ese correo de invitación**. Los correos de restablecimiento de contraseña a personas externas tampoco funcionarán sin SMTP externo; por ahora, cada persona cambia contraseña estando conectada. Una futura función administrativa de restablecimiento o un SMTP gratuito son alternativas.
- La versión inicial tiene cero clientes, insumos y usuarios activos hasta completar el acceso administrador.
- Gratis sujeto a límites. Los proyectos Supabase Free pueden pausarse por inactividad y no incluyen respaldos automáticos de producción.
- Antes de cargar información laboral real, valida la autorización de la empresa y prueba el flujo con dos dispositivos. **Todavía no se verificó una prueba integral de punta a punta con usuarios reales.**
