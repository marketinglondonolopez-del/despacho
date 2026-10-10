# Sistema Inteligente de Despacho de Servicios por WhatsApp & PWA

> Plataforma profesional, modular, segura y escalable de despacho de servicios de transporte, diseñada para reemplazar la coordinación manual en grupos de WhatsApp por un motor automatizado basado en Meta Cloud API oficial, PWA para conductores y Centro de Control web para administradores.

---

## 🌟 Características Principales

* **WhatsApp Oficial (Meta Cloud API Graph v20.0)**: Sin emuladores, scraping ni automatizaciones riesgosas. Mensajes interactivos, botones de acción inmediata y listas interactivas.
* **Dispatch Engine Multicriterio**: Algoritmo de puntuación por distancia vial, ETA, reputación/rating del conductor, tasa de aceptación y frescura de la señal GPS.
* **Sistema de Rondas Progresivas**: Ronda 1 (3 conductores más cercanos, 15s), Ronda 2 (5 conductores, 20s), Ronda 3 (expansión de radio hasta 8 km).
* **Prevención de Condiciones de Carrera (Atomic Claim)**: Bloqueo distribuido en Redis + transacción ACID con `SELECT ... FOR UPDATE` en PostgreSQL. Si dos conductores aceptan al mismo milisegundo, solo uno gana y el otro recibe notificación de asignación previa.
* **PWA "Modo Conductor"**: Aplicación web progresiva móvil con control de disponibilidad (🟢 Disponible, 🟡 Pausa, ⚫ Offline), telemetría GPS continua cada 7 segundos, Screen Wake Lock para evitar suspensión de pantalla y acciones de viaje de un solo toque (*"YA LLEGUÉ"*, *"▶️ INICIAR"*, *"✅ FINALIZAR"*).
* **Módulo de Calificación y Reputación**: Calificación post-servicio de 1 a 5 estrellas por WhatsApp, tags opcionales de experiencia, recálculo dinámico de medias y distribución, anonimización total hacia el conductor y alertas automáticas de calidad para 1 y 2 estrellas.
* **Despacho Manual de Emergencia**: Asignación forzosa inmediata desde el panel administrativo si falla la respuesta automática.
* **Resiliencia Operativa**: Estados persistidos en base de datos. Ningún servicio activo se pierde si el servidor se reinicia.

---

## 🏗️ Pila Tecnológica

* **Backend / API**: Node.js 20+, TypeScript, Next.js App Router (Arquitectura Modular Hexagonal / DDD).
* **Base de Datos**: PostgreSQL 16 con Prisma ORM.
* **Caché y Bloqueo Distribuido**: Redis 7 con fallback inteligente en memoria para desarrollo local.
* **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons.
* **Infraestructura**: Docker, Docker Compose, Alpine Linux.

---

## 🚀 Inicio Rápido (Local)

### 1. Clonar o acceder al proyecto
```bash
cd "C:\Users\VIOLETTA LONDOÑO L\.gemini\antigravity\scratch\whatsapp-dispatch-system"
```

### 2. Variables de entorno
Copiar `.env.example` a `.env` y configurar las claves:
```bash
cp .env.example .env
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Generar cliente Prisma
```bash
npx prisma generate
```

### 5. Ejecutar pruebas unitarias y de dominio
```bash
npm run test
```

### 6. Levantar servidor en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en:
* **Panel de Control**: `http://localhost:3000`
* **Modo Conductor (PWA)**: `http://localhost:3000/driver-mode`
* **Historial de Servicios**: `http://localhost:3000/services`
* **Reputación y Alertas**: `http://localhost:3000/reputation`
* **Webhook de WhatsApp**: `http://localhost:3000/api/webhooks/whatsapp`

---

## 📚 Documentación Técnica Detallada

* [ARCHITECTURE.md](./ARCHITECTURE.md) - Diagrama de arquitectura, flujo de eventos y matriz de estados.
* [API.md](./API.md) - Especificación OpenAPI de endpoints REST y Webhook.
* [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) - Guía paso a paso para configurar Meta WhatsApp Cloud API.
* [DATABASE.md](./DATABASE.md) - Modelos relacionales, índices y estrategias de consulta.
* [SECURITY.md](./SECURITY.md) - Protocolos de seguridad, hashing, HMAC y privacidad.
* [TESTING.md](./TESTING.md) - Estrategia de pruebas de concurrencia y scoring.
* [DEPLOYMENT.md](./DEPLOYMENT.md) - Despliegue en producción con Docker y VPS.
* [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Diagnóstico y resolución de incidencias comunes.
