import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type JwtUserPayload = {
  sub: string;
  tid: string;
  email: string;
  role: string;
  typ?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }
    const token = header.slice(7).trim();
    try {
      const payload = this.jwt.verify<JwtUserPayload>(token);
      if (!payload.tid || payload.typ === 'platform') {
        throw new UnauthorizedException('Token no válido para el panel de comercio');
      }
      (req as Request & { user: JwtUserPayload }).user = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }
}
