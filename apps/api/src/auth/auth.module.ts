import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET?.trim();
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET es obligatorio y debe tener al menos 32 caracteres. ' +
              'Generá uno con: openssl rand -hex 64',
          );
        }
        const raw = process.env.JWT_EXPIRES_IN;
        const expiresInSec =
          raw && /^\d+$/.test(raw) ? Number(raw) : 60 * 60 * 24 * 7;
        return {
          secret,
          signOptions: { expiresIn: expiresInSec },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
