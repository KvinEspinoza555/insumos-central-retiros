# Insumos Central Retiros v2.0 — PIN para administrador

## Nueva función
- El administrador puede entrar con su ID y un PIN de 4 cifras, o seguir usando su contraseña.
- Para configurar el PIN por primera vez: iniciar sesión con contraseña actual > **Mi PIN** (en el lateral, o Menú **Más** desde celular).
- Se pide la contraseña actual para guardar o cambiar el PIN; el PIN no se transmite en un enlace ni se expone en el listado de usuarios.
- Los intentos erróneos de PIN de administrador se limitan a cinco y después se bloquean durante 24 horas. La contraseña habitual permanece activa.
- No se modifican los PIN de los solicitantes, datos operativos ni permisos existentes.
- Los PIN de 4 números son más fáciles de adivinar que una contraseña fuerte. Utilizar en dispositivos propios y no compartir el PIN.

## Instalación
1. Descomprimir el ZIP y subir sus **11 archivos** a la raíz del repositorio GitHub, sustituyendo los anteriores.
2. Hacer Commit changes y actualizar Render con **Manual Deploy > Deploy latest commit** si no se publica automáticamente.
3. Abrir la versión publicada, iniciar sesión con el ID de administrador y su contraseña actual.
4. Pulsar **Mi PIN** > confirmar contraseña actual > introducir PIN > Guardar PIN.
5. Cerrar sesión y probar el acceso por ID + PIN. Si no entra, usar la contraseña habitual.

## Backend
Supabase: `admin-set-own-pin` (solo administradores autenticados y revalidación de contraseña), `verify_admin_pin` (solo service role), y `login-with-id` actualizada. PIN protegido con hash bcrypt en esquema privado.

Versión: 2.0.0
