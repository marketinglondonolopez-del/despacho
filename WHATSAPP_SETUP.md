# Guía de Configuración Oficial de Meta WhatsApp Cloud API

Para conectar la plataforma a la API Oficial de Meta (WhatsApp Business Cloud API), sigue estos pasos:

---

### Paso 1: Crear App en Meta for Developers
1. Ingresa a [developers.facebook.com](https://developers.facebook.com/).
2. Haz clic en **Mis Apps** > **Crear App**.
3. Selecciona el tipo de App: **Negocios (Business)**.
4. Asigna un nombre a la aplicación (ej. `Despacho Transporte Oficial`) y vincula tu cuenta de Business Manager.

---

### Paso 2: Agregar el Producto WhatsApp
1. En el panel de la App, busca **WhatsApp** en la sección "Agregar productos" y pulsa **Configurar**.
2. En la sección **Inicio rápido**, Meta te proporcionará:
   * **Phone Number ID**: Identificador numérico de la línea telefónica.
   * **WhatsApp Business Account ID (WABA ID)**: Identificador de la cuenta.
   * **Token temporal de acceso**.

---

### Paso 3: Generar Token Permanente de Usuario del Sistema
> ⚠️ **IMPORTANTE**: No uses el token temporal de 24 horas en producción.

1. Ve a tu **Configuración del Negocio** de Meta ([business.facebook.com/settings](https://business.facebook.com/settings)).
2. Navega a **Usuarios** > **Usuarios del Sistema**.
3. Haz clic en **Agregar** y crea un usuario con rol de **Administrador** (ej. `bot-despacho-service`).
4. En **Activos asignados**, añade la App y otorga control total.
5. Haz clic en **Generar nuevo token**, selecciona la App y marca los siguientes permisos:
   * `whatsapp_business_messaging`
   * `whatsapp_business_management`
6. Copia el token generado y configúralo en la variable `WHATSAPP_ACCESS_TOKEN`.

---

### Paso 4: Configurar el Webhook
1. En el panel de Meta developers de tu App, ve a **WhatsApp** > **Configuración**.
2. En la sección **Webhook**, haz clic en **Editar**:
   * **URL de devolución de llamada**: `https://tu-dominio.com/api/webhooks/whatsapp`
   * **Identificador de verificación**: El valor que definiste en `WHATSAPP_VERIFY_TOKEN` (ej: `super_secret_verify_token_123`).
3. Haz clic en **Verificar y Guardar**.
4. En **Campos de webhook**, suscríbete a:
   * `messages` (Obligatorio para recibir textos, botones y ubicaciones).
   * `message_template_status_update` (Opcional).

---

### Paso 5: Probar el Flujo
1. Agrega el número de tu WhatsApp personal a los números de prueba autorizados en Meta.
2. Envía la palabra `Hola` al número asignado por Meta.
3. El bot responderá de inmediato con los botones:
   * 🚕 SOLICITAR SERVICIO
   * 📋 CONSULTAR SERVICIO
   * ❌ CANCELAR SERVICIO
