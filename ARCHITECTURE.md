# Arquitectura del Sistema de Despacho Inteligente

## 1. Principios de Diseño
* **Agnosticismo de Canales**: La lógica de despacho, cálculo de scoring, asignación atómica y reputación reside íntegramente en el backend (`src/modules/*`), sin acoplarse a WhatsApp. Si en el futuro se añade una App móvil nativa en Flutter/React Native, reutiliza los mismos servicios y endpoints.
* **Trazabilidad Inmutable**: Cada cambio de estado de un viaje se almacena de forma inmutable en la tabla `ServiceEvent`, permitiendo auditar con exactitud el segundo en que se notificó, se aceptó o se completó un servicio.
* **Resiliencia ante Fallos Externos**: Si Meta WhatsApp o Google Maps sufren degradación o caída de red, el sistema captura los errores con políticas de reintento y fallback sin interrumpir la operación del panel web ni congelar la base de datos.

## 2. Diagrama de Flujo Punta a Punta

```mermaid
sequenceDiagram
    autonumber
    actor Pasajero
    participant WA as Meta WhatsApp Cloud API
    participant BE as Dispatch Backend
    participant DB as PostgreSQL
    participant REDIS as Redis Lock
    actor Conductor

    Pasajero->>WA: "Hola" / "Solicitar Servicio"
    WA->>BE: Webhook POST (Verificación HMAC & Dedup)
    BE->>WA: Solicita Origen, Destino, Pasajeros, Observación
    Pasajero->>WA: Envía datos y confirma resumen
    WA->>BE: Solicitud confirmada
    BE->>DB: Crea Service (SEARCHING_DRIVER, SRV-...)
    BE->>BE: Dispatch Engine filtra y puntúa candidatos
    BE->>WA: Notifica Ronda 1 (3 conductores más cercanos)
    WA->>Conductor: "🚨 NUEVO SERVICIO DISPONIBLE"
    Conductor->>WA: "🟢 TOMAR SERVICIO"
    WA->>BE: Intento de aceptación
    BE->>REDIS: Adquiere lock distribuido
    BE->>DB: Transacción con SELECT FOR UPDATE
    BE->>DB: Asigna conductor y cambia estado a DRIVER_ACCEPTED
    BE->>REDIS: Libera lock
    BE->>WA: Confirma servicio a Pasajero con perfil y placa
    Pasajero->>WA: "✅ CONFIRMAR"
    BE->>WA: Envía datos de contacto a ambos
    Conductor->>BE: "YA LLEGUÉ" (PWA / WhatsApp)
    BE->>WA: Notifica llegada al Pasajero
    Conductor->>BE: "▶️ INICIAR SERVICIO"
    Conductor->>BE: "✅ FINALIZAR SERVICIO"
    BE->>DB: Estado COMPLETED + Libera conductor a AVAILABLE
    BE->>WA: Envía solicitud de calificación (1 a 5 estrellas)
    Pasajero->>WA: Califica ⭐⭐⭐⭐⭐
    BE->>DB: Registra Rating y recalcula promedio dinámico
```

## 3. Matriz de Estados del Servicio (`ServiceStatus`)

| Estado Inicial | Siguientes Estados Permitidos | Disparador |
| :--- | :--- | :--- |
| `CREATED` | `SEARCHING_DRIVER`, `CANCELLED_BY_CUSTOMER`, `EXPIRED` | Sistema / Pasajero |
| `SEARCHING_DRIVER` | `DRIVER_OFFERED`, `NO_DRIVER_AVAILABLE`, `CANCELLED_BY_CUSTOMER` | Dispatch Engine |
| `DRIVER_OFFERED` | `DRIVER_ACCEPTED`, `SEARCHING_DRIVER`, `WAITING_CUSTOMER_CONFIRMATION` | Conductor |
| `DRIVER_ACCEPTED` | `CONFIRMED`, `DRIVER_EN_ROUTE`, `CANCELLED_BY_DRIVER` | Pasajero / Conductor |
| `WAITING_CUSTOMER_CONFIRMATION`| `CONFIRMED`, `SEARCHING_DRIVER`, `CANCELLED_BY_CUSTOMER` | Pasajero |
| `CONFIRMED` | `DRIVER_EN_ROUTE`, `DRIVER_ARRIVED`, `CANCELLED_BY_DRIVER` | Conductor |
| `DRIVER_EN_ROUTE` | `DRIVER_ARRIVED`, `CANCELLED_BY_DRIVER` | Conductor |
| `DRIVER_ARRIVED` | `PASSENGER_PICKED_UP`, `IN_PROGRESS`, `CANCELLED_BY_DRIVER` | Conductor |
| `IN_PROGRESS` | `COMPLETED` | Conductor |
| `COMPLETED` | *Terminal* | Pasajero (Califica) |
| `CANCELLED_BY_DRIVER` | `SEARCHING_DRIVER` (Reactivación automática) | Sistema |
