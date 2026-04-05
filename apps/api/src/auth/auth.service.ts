import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlanType, Prisma, Tenant, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OrderNotificationsService } from '../notifications/order-notifications.service';
import { ResendMailService } from '../notifications/resend-mail.service';
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

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function redactEmail(email: string): string {
  const [a, d] = email.split('@');
  if (!d) return '***';
  const head = a.length <= 2 ? '*' : `${a.slice(0, 2)}…`;
  return `${head}@${d}`;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly orderNotifications: OrderNotificationsService,
    private readonly resendMail: ResendMailService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.accepts_terms !== true) {
      throw new BadRequestException(
        'Debés aceptar términos y condiciones para registrarte',
      );
    }
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
      this.orderNotifications.scheduleRegistrationEmails({
        tenantEmail: tenant.email,
        tenantName: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone,
        plan: tenant.plan,
        ownerName: user.name,
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

  /**
   * No revela si el email existe. Usa Resend (HTTPS), apto para Railway sin SMTP.
   */
  async requestPasswordReset(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const okResponse = {
      ok: true as const,
      message:
        'Si ese email está registrado, recibirás un enlace para restablecer la contraseña.',
    };

    const tenant = await this.prisma.tenant.findUnique({ where: { email } });
    if (!tenant) {
      return okResponse;
    }
    const user = await this.prisma.user.findUnique({
      where: { tenant_id_email: { tenant_id: tenant.id, email } },
    });
    if (!user?.is_active) {
      return okResponse;
    }

    const ttlMs = Number(
      process.env.PASSWORD_RESET_TOKEN_TTL_MS || 3_600_000,
    );
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      }),
    ]);

    const adminBase = (
      process.env.PUBLIC_ADMIN_URL?.trim() ||
      'http://localhost:3002'
    ).replace(/\/$/, '');
    const resetUrl = `${adminBase}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const subject = '[VentaXLink] Restablecer contraseña del panel';
    const text = [
      `Hola${user.name ? ` ${user.name}` : ''},`,
      '',
      'Para elegir una nueva contraseña del panel de tu comercio, abrí este enlace:',
      resetUrl,
      '',
      `El enlace vence en aproximadamente ${Math.round(ttlMs / 60000)} minutos.`,
      '',
      'Si no pediste este cambio, ignorá este mensaje.',
      '',
      '— VentaXLink',
    ].join('\n');
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
<p>Hola${user.name ? ` <strong>${escapeHtml(user.name)}</strong>` : ''},</p>
<p>Para restablecer la contraseña de tu panel, hacé clic:</p>
<p><a href="${escapeHtml(resetUrl)}" style="color:#2563EB">Restablecer contraseña</a></p>
<p style="font-size:14px;color:#666">O copiá esta URL en el navegador:<br/><span style="word-break:break-all">${escapeHtml(resetUrl)}</span></p>
<p style="font-size:14px;color:#666">El enlace vence en unos minutos. Si no pediste el cambio, ignorá este correo.</p>
<p style="font-size:14px;color:#999">— VentaXLink</p>
</body></html>`;

    const sent = await this.resendMail.send({
      to: email,
      subject,
      text,
      html,
    });
    if (!sent) {
      this.logger.warn(
        `[password-reset] no se pudo enviar mail a ${redactEmail(email)} (¿RESEND_API_KEY / dominio?)`,
      );
    } else {
      this.logger.log(`[password-reset] mail enviado a ${redactEmail(email)}`);
    }

    return okResponse;
  }

  async resetPasswordWithToken(rawToken: string, newPassword: string) {
    const tokenHash = sha256Hex(rawToken.trim());
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });
    if (!row || row.expires_at < new Date()) {
      throw new BadRequestException(
        'El enlace no es válido o expiró. Pedí uno nuevo desde “Olvidé mi contraseña”.',
      );
    }
    if (!row.user.is_active) {
      throw new BadRequestException('La cuenta no está activa.');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.user_id },
        data: { password_hash },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { user_id: row.user_id },
      }),
    ]);

    return { ok: true as const, message: 'Contraseña actualizada. Ya podés iniciar sesión.' };
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
