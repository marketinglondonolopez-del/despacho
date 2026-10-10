import { describe, it, expect } from 'vitest';
import { ServiceStateMachine } from '../core/state-machine/service-state-machine';
import { ServiceStatus } from '@prisma/client';
import { ConflictError } from '../core/errors/app-error';

describe('ServiceStateMachine', () => {
  it('permite transiciones válidas del ciclo de vida del servicio', () => {
    expect(
      ServiceStateMachine.canTransition(ServiceStatus.CREATED, ServiceStatus.SEARCHING_DRIVER)
    ).toBe(true);

    expect(
      ServiceStateMachine.canTransition(ServiceStatus.SEARCHING_DRIVER, ServiceStatus.DRIVER_OFFERED)
    ).toBe(true);

    expect(
      ServiceStateMachine.canTransition(ServiceStatus.DRIVER_OFFERED, ServiceStatus.DRIVER_ACCEPTED)
    ).toBe(true);

    expect(
      ServiceStateMachine.canTransition(ServiceStatus.DRIVER_ACCEPTED, ServiceStatus.CONFIRMED)
    ).toBe(true);

    expect(
      ServiceStateMachine.canTransition(ServiceStatus.CONFIRMED, ServiceStatus.DRIVER_ARRIVED)
    ).toBe(true);

    expect(
      ServiceStateMachine.canTransition(ServiceStatus.DRIVER_ARRIVED, ServiceStatus.IN_PROGRESS)
    ).toBe(true);

    expect(
      ServiceStateMachine.canTransition(ServiceStatus.IN_PROGRESS, ServiceStatus.COMPLETED)
    ).toBe(true);
  });

  it('bloquea transiciones ilegales y lanza ConflictError', () => {
    // Un servicio COMPLETED no puede volver a IN_PROGRESS
    expect(
      ServiceStateMachine.canTransition(ServiceStatus.COMPLETED, ServiceStatus.IN_PROGRESS)
    ).toBe(false);

    expect(() => {
      ServiceStateMachine.validateTransition(ServiceStatus.COMPLETED, ServiceStatus.IN_PROGRESS);
    }).toThrow(ConflictError);

    // Un servicio recién CREATED no puede pasar directamente a COMPLETED sin pasar por el flujo
    expect(
      ServiceStateMachine.canTransition(ServiceStatus.CREATED, ServiceStatus.COMPLETED)
    ).toBe(false);

    expect(() => {
      ServiceStateMachine.validateTransition(ServiceStatus.CREATED, ServiceStatus.COMPLETED);
    }).toThrow(ConflictError);
  });

  it('identifica correctamente estados terminales', () => {
    expect(ServiceStateMachine.isTerminal(ServiceStatus.COMPLETED)).toBe(true);
    expect(ServiceStateMachine.isTerminal(ServiceStatus.CANCELLED_BY_CUSTOMER)).toBe(true);
    expect(ServiceStateMachine.isTerminal(ServiceStatus.IN_PROGRESS)).toBe(false);
  });
});
