# Guía de Diagnóstico y Resolución de Problemas (Troubleshooting)

---

### 1. El Webhook de Meta no verifica o devuelve error
* **Causa 1**: El token de verificación en el panel de Meta no coincide exactamente con `WHATSAPP_VERIFY_TOKEN`.
  * **Solución**: Asegúrate de que no haya espacios en blanco antes o después en el archivo `.env`.
* **Causa 2**: El servidor no responde con HTTPS o el certificado SSL está autofirmado.
  * **Solución**: Meta rechaza conexiones HTTP o certificados autofirmados. Usa Let's Encrypt o Cloudflare.

---

### 2. Mensajes duplicados en WhatsApp
* **Causa**: El endpoint del webhook tardó más de 3 segundos en responder y Meta reenvió el evento.
  * **Solución**: Nuestro backend encola el evento y responde HTTP 200 en menos de 50ms, además de aplicar deduplicación con clave `msg:dedup:<wamid>`. Si ocurre, verifica que Redis esté en línea.

---

### 3. Error en WhatsApp al enviar 5 botones en un mensaje
* **Error**: `(#100) Parameter interactive.action.buttons exceeds max items (3)`.
* **Causa**: Meta Cloud API limita estrictamente los mensajes de tipo `button` a un máximo de 3 botones.
* **Solución**: En nuestro código, la calificación de 1 a 5 estrellas y los tags de experiencia se envían mediante **Interactive List Messages** (`type: "list"`), que permiten hasta 10 elementos sin ninguna restricción.

---

### 4. Dos conductores aceptaron el mismo servicio casi al mismo tiempo
* **Comportamiento Esperado**: Gracias al Distributed Lock en Redis y la transacción con `SELECT ... FOR UPDATE` en PostgreSQL, el primer conductor que confirme se queda con el servicio. El segundo recibe de inmediato el mensaje:
  *"❌ SERVICIO YA ASIGNADO. Este servicio acaba de ser asignado a otro conductor."*

---

### 5. La PWA del conductor deja de transmitir GPS al apagar la pantalla
* **Causa**: El navegador móvil suspende la ejecución de JavaScript en segundo plano para ahorrar batería.
* **Solución**: La PWA solicita automáticamente la API `Screen Wake Lock` mientras el conductor esté en estado `AVAILABLE`. Adicionalmente, el servidor marca a los conductores con más de 45 segundos sin señal como `isLocationStale = true` y los penaliza temporalmente en el scoring de asignación hasta que reactiven su pantalla.
