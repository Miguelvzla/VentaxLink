import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from '../auth/dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformJwtPayload } from './platform-jwt-payload.type';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email },
    });
    if (!admin) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    const ok = await bcrypt.compare(dto.password, admin.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    const payload: PlatformJwtPayload = {
      sub: admin.id,
      email: admin.email,
      typ: 'platform',
    };
    const access_token = await this.jwt.signAsync(payload);
    return {
      access_token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }
}
