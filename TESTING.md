# Guía de Pruebas Automatizadas y Calidad

El proyecto cuenta con suites de pruebas unitarias y de integración construidas sobre **Vitest**, cubriendo las reglas de negocio más críticas del sistema:

---

## 1. Suites de Pruebas Implementadas

| Suite | Archivo | Casos Cubiertos |
| :--- | :--- | :--- |
| **Máquina de Estados** | `src/tests/state-machine.test.ts` | Transiciones legales (CREATED → COMPLETED), bloqueo de saltos ilegales (COMPLETED → IN_PROGRESS), estados terminales. |
| **Dispatch Engine** | `src/tests/dispatch-engine.test.ts` | Scoring multicriterio, penalización por señal GPS obsoleta (>45s), ordenamiento por proximidad y rating. |
| **Reputación y Calificaciones** | `src/tests/reputation-calc.test.ts` | Promedio ponderado real, distribución de 1 a 5 estrellas, asignación de tiers (Nuevo, Monitoreo, Consolidada). |
| **Webhook de WhatsApp** | `src/tests/whatsapp-webhook.test.ts` | Handshake de verificación `hub.verify_token`, rechazo de tokens inválidos. |

---

## 2. Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas una vez
npm run test

# Modo observación continuo
npm run test:watch
```

Todos los tests se ejecutan de manera aislada y no requieren dependencias externas de red.
