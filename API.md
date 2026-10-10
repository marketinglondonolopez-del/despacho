# Documentación de la API REST y Webhooks

## 1. Webhook de WhatsApp (Meta Cloud API)

### `GET /api/webhooks/whatsapp`
Handshake de suscripción para Meta developers.
* **Query Params**:
  * `hub.mode`: `"subscribe"`
  * `hub.verify_token`: Token configurado en el servidor (`WHATSAPP_VERIFY_TOKEN`)
  * `hub.challenge`: Código aleatorio de verificación generado por Meta
* **Respuesta**: HTTP 200 con el string exacto de `hub.challenge`.

### `POST /api/webhooks/whatsapp`
Ingesta asíncrona de mensajes y eventos de WhatsApp.
* **Headers**: `X-Hub-Signature-256: sha256=<hmac>`
* **Respuesta Inmediata**: HTTP 200 `{ "status": "EVENT_RECEIVED" }` (< 50ms).

---

## 2. Servicios de Transporte

### `GET /api/services`
Consulta listado de viajes.
* **Filtros**: `?status=IN_PROGRESS&driverId=<uuid>`

### `POST /api/services`
Crea un nuevo servicio directamente.
```json
{
  "passengerPhone": "573001234567",
  "passengerName": "Juan Pérez",
  "originAddress": "Barrio Granada",
  "destinationAddress": "Unicentro",
  "passengersCount": 2,
  "notes": "2 maletas grandes"
}
```

### `POST /api/services/:id/claim`
Aceptación atómica por parte del conductor.
```json
{
  "driverId": "uuid-del-conductor"
}
```
* **Respuestas**:
  * HTTP 200: Asignado exitosamente.
  * HTTP 409: `❌ SERVICIO YA ASIGNADO` (Si otro conductor ganó la carrera por milisegundos).

### `POST /api/services/:id/arrive`
Conductor notifica que llegó al punto de recogida (*"YA LLEGUÉ"*).

### `POST /api/services/:id/start`
Conductor inicia el viaje (*"▶️ INICIAR SERVICIO"*).

### `POST /api/services/:id/complete`
Conductor finaliza el viaje (*"✅ FINALIZAR SERVICIO"*). Libera al conductor a `AVAILABLE` y envía encuesta de calificación al pasajero.

### `POST /api/services/:id/cancel`
Cancelación de servicio.
```json
{
  "cancelledBy": "CUSTOMER", // o "DRIVER"
  "reason": "Ya no necesito el transporte",
  "passengerId": "uuid-pasajero"
}
```

### `POST /api/services/:id/manual-assign`
Despacho manual de emergencia por el administrador.
```json
{
  "driverId": "uuid-conductor",
  "adminUserId": "uuid-admin"
}
```

---

## 3. Conductores y Telemetría GPS

### `GET /api/drivers`
Lista todos los conductores y vehículos registrados.

### `POST /api/drivers/:id/location`
Transmisión periódica de coordenadas desde la PWA (cada 7 seg).
```json
{
  "latitude": 3.4578,
  "longitude": -76.5332,
  "accuracyMeters": 5,
  "speedKmh": 28
}
```

### `POST /api/drivers/:id/status`
Cambio de disponibilidad operativa: `AVAILABLE`, `BUSY`, `PAUSED`, `OFFLINE`.

---

## 4. Calificaciones y Reputación

### `GET /api/ratings`
Consulta para administradores con soporte de filtros: `?minStars=1&maxStars=2`

### `POST /api/ratings`
Registro de evaluación post-viaje.
```json
{
  "serviceId": "uuid-servicio",
  "passengerId": "uuid-pasajero",
  "stars": 5,
  "feedbackTag": "Excelente servicio",
  "comment": "Muy amable y vehículo impecable"
}
```
