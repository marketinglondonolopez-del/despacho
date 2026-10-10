import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { Role } from '@prisma/client';
import { UnauthorizedError } from '../../core/errors/app-error';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  driverId?: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static signToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }

  public static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Token de sesión inválido o expirado.');
    }
  }

  public static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { driver: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Credenciales incorrectas o usuario inactivo.');
    }

    const isMatch = await this.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales incorrectas.');
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      driverId: user.driver?.id,
    };

    const token = this.signToken(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        driverId: user.driver?.id,
      },
    };
  }
}
