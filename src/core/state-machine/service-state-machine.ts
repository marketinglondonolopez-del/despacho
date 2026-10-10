import { ServiceStatus, DriverStatus } from '@prisma/client';
import { ConflictError } from '../errors/app-error';

/**
 * Matriz estricta de transiciones de estado para Servicios de Transporte
 */
export const VALID_SERVICE_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  CREATED: [
    ServiceStatus.SEARCHING_DRIVER,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
    ServiceStatus.EXPIRED,
  ],
  SEARCHING_DRIVER: [
    ServiceStatus.DRIVER_OFFERED,
    ServiceStatus.NO_DRIVER_AVAILABLE,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
    ServiceStatus.EXPIRED,
  ],
  DRIVER_OFFERED: [
    ServiceStatus.DRIVER_ACCEPTED,
    ServiceStatus.SEARCHING_DRIVER, // Si el conductor rechaza o expira la oferta
    ServiceStatus.WAITING_CUSTOMER_CONFIRMATION, // Si el conductor reporta demora
    ServiceStatus.NO_DRIVER_AVAILABLE,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
    ServiceStatus.EXPIRED,
  ],
  DRIVER_ACCEPTED: [
    ServiceStatus.CONFIRMED,
    ServiceStatus.DRIVER_EN_ROUTE,
    ServiceStatus.CANCELLED_BY_DRIVER,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
  ],
  WAITING_CUSTOMER_CONFIRMATION: [
    ServiceStatus.CONFIRMED,
    ServiceStatus.SEARCHING_DRIVER, // Si el pasajero no acepta la demora
    ServiceStatus.CANCELLED_BY_CUSTOMER,
    ServiceStatus.EXPIRED,
  ],
  CONFIRMED: [
    ServiceStatus.DRIVER_EN_ROUTE,
    ServiceStatus.DRIVER_ARRIVED,
    ServiceStatus.CANCELLED_BY_DRIVER,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
  ],
  DRIVER_EN_ROUTE: [
    ServiceStatus.DRIVER_ARRIVED,
    ServiceStatus.CANCELLED_BY_DRIVER,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
  ],
  DRIVER_ARRIVED: [
    ServiceStatus.PASSENGER_PICKED_UP,
    ServiceStatus.IN_PROGRESS,
    ServiceStatus.CANCELLED_BY_DRIVER,
    ServiceStatus.CANCELLED_BY_CUSTOMER,
  ],
  PASSENGER_PICKED_UP: [
    ServiceStatus.IN_PROGRESS,
    ServiceStatus.COMPLETED,
    ServiceStatus.CANCELLED_BY_DRIVER,
  ],
  IN_PROGRESS: [
    ServiceStatus.COMPLETED,
  ],
  COMPLETED: [], // Estado terminal
  CANCELLED_BY_CUSTOMER: [], // Estado terminal
  CANCELLED_BY_DRIVER: [
    ServiceStatus.SEARCHING_DRIVER, // Se reasigna si se cancela antes de recoger
  ],
  NO_DRIVER_AVAILABLE: [
    ServiceStatus.SEARCHING_DRIVER, // Si el cliente elige reintentar con mayor radio
    ServiceStatus.CANCELLED_BY_CUSTOMER,
  ],
  EXPIRED: [], // Estado terminal
};

export class ServiceStateMachine {
  /**
   * Valida si una transición de estado es válida según el flujo de negocio
   */
  public static canTransition(current: ServiceStatus, next: ServiceStatus): boolean {
    const allowed = VALID_SERVICE_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  /**
   * Ejecuta la validación y lanza un error descriptivo si la transición es inválida
   */
  public static validateTransition(current: ServiceStatus, next: ServiceStatus): void {
    if (!this.canTransition(current, next)) {
      throw new ConflictError(
        `Transición inválida de estado de servicio: no es posible pasar de [${current}] a [${next}].`
      );
    }
  }

  /**
   * Determina si el servicio está en un estado activo (no finalizado)
   */
  public static isTerminal(status: ServiceStatus): boolean {
    const terminals: ServiceStatus[] = [
      ServiceStatus.COMPLETED,
      ServiceStatus.CANCELLED_BY_CUSTOMER,
      ServiceStatus.EXPIRED,
    ];
    return terminals.includes(status);
  }
}
