# Modelo de Datos, Índices y Estrategia de Persistencia

## 1. Motores y Herramientas
* **Base de Datos Principal**: PostgreSQL 16
* **ORM**: Prisma ORM v5.22
* **Estrategia de Índices**: B-Tree e índices compuestos para consultas de alta concurrencia.

---

## 2. Índices Críticos para Rendimiento

```prisma
model Driver {
  // Índice para filtrado de conductores disponibles en el Dispatch Engine
  @@index([status])
  // Índice para búsqueda instantánea por número telefónico de WhatsApp
  @@index([phone])
  // Índice compuesto geoespacial para consultas de proximidad
  @@index([currentLatitude, currentLongitude])
}

model Service {
  // Índice para filtrado de servicios activos en el panel administrativo
  @@index([status])
  // Índice único para búsqueda por código público (SRV-YYYYMMDD-XXXXXX)
  @@index([publicCode])
  // Índice temporal para reportes del día y cálculo de métricas
  @@index([createdAt])
}

model Rating {
  // Índice para consultas de alertas de calidad y calificaciones bajas
  @@index([driverId, stars])
  @@index([createdAt])
}
```

---

## 3. Comandos Útiles de Migración y Sembrado

### Generar Cliente Prisma
```bash
npx prisma generate
```

### Sincronizar Esquema con Base de Datos
```bash
npx prisma db push
```

### Inicializar Datos Base (Seed)
```bash
npm run prisma:seed
```

### Inspeccionar Datos en Prisma Studio
```bash
npx prisma studio
```
