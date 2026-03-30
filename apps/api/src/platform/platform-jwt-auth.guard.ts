import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PlatformJwtPayload } from './platform-jwt-payload.type';

@Injectable()
export class PlatformJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }
    const token = header.slice(7).trim();
    try {
      const payload = this.jwt.verify<PlatformJwtPayload>(token);
      if (payload.typ !== 'platform') {
        throw new UnauthorizedException('Token no válido para plataforma');
      }
      (req as Request & { platformUser: PlatformJwtPayload }).platformUser =
        payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }
}
