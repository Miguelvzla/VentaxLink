import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlanType, Prisma, Tenant, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type JwtPayload = {
  sub: string;
  tid: string;
  email: string;
  role: UserRole;
  typ: 'tenant';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const storeName = dto.storeName.trim();
    const slug = dto.slug.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const ownerName = (dto.ownerName?.trim() || storeName).slice(0, 120);

    const takenSlug = await this.prisma.tenant.findUnique({ where: { slug } });
    if (takenSlug) {
      throw new ConflictException('Ese link ya está en uso. Probá con otro.');
    }
    const takenEmail = await this.prisma.tenant.findUnique({ where: { email } });
    if (takenEmail) {
      throw new ConflictException('Ese email ya está registrado.');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const planRaw = dto.plan ?? 'STARTER';
    const plan =
      planRaw === 'PRO'
        ? PlanType.PRO
        : planRaw === 'WHOLESALE'
          ? PlanType.WHOLESALE
          : PlanType.STARTER;

    try {
      const { tenant, user } = await this.prisma.$transaction(async (tx) => {
        const t = await tx.tenant.create({
          data: {
            slug,
            name: storeName,
            phone,
            email,
            plan,
            status: 'ACTIVE',
            trial_ends_at: null,
            plan_expires_at: null,
          },
        });
        const u = await tx.user.create({
          data: {
            tenant_id: t.id,
            email,
            password_hash,
            name: ownerName,
            role: 'OWNER',
          },
        });
        return { tenant: t, user: u };
      });
      return this.buildAuthResponse(user, tenant);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese email o link ya está en uso.');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const tenant = await this.prisma.tenant.findUnique({ where: { email } });
    if (!tenant) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    const user = await this.prisma.user.findUnique({
      where: {
        tenant_id_email: { tenant_id: tenant.id, email },
      },
    });
    if (!user?.is_active) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });
    return this.buildAuthResponse(user, tenant);
  }

  private async buildAuthResponse(user: User, tenant: Tenant) {
    const payload: JwtPayload = {
      sub: user.id,
      tid: tenant.id,
      email: user.email,
      role: user.role,
      typ: 'tenant',
    };
    const access_token = await this.jwt.signAsync(payload);
    return {
      access_token,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
