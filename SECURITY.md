# Política de Seguridad, Privacidad y Cumplimiento

## 1. Protección de Datos y Privacidad
* **Anonimato en Calificaciones**: El conductor nunca ve el nombre ni el número del pasajero que emitió una calificación. Solo visualiza el valor numérico (ej. *"Recibiste ⭐⭐⭐⭐⭐"*).
* **Protección de Placa Vehicular**: En la confirmación previa, la placa del vehículo puede proyectarse parcialmente protegida (`ABC-***`) para mitigar riesgos de perfilamiento.
* **Retención de Datos GPS**: Las ubicaciones históricas en `DriverLocation` cuentan con política de depuración configurable a los 30 días, conservando únicamente las métricas agregadas del viaje.

## 2. Autenticación y Autorización
* **Contraseñas**: Cifradas con algoritmo `bcrypt` (10 rondas de salt).
* **Tokens JWT**: Firmados con clave de 256 bits, expiración obligatoria de 7 días.
* **Separación de Roles**: `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, `DRIVER`. Los conductores no tienen acceso al panel de control administrativo.

## 3. Integridad en Webhooks de Meta
* **Firma Criptográfica**: Cada payload entrante se verifica contra el encabezado `X-Hub-Signature-256` utilizando `crypto.timingSafeEqual` para prevenir ataques de temporización (timing attacks).
* **Idempotencia**: Deduplicación de identificadores de mensaje `wamid` en Redis con TTL de 24 horas para evitar duplicación de viajes por reintentos de Meta.
