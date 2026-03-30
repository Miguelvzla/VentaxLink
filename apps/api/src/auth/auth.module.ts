import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const raw = process.env.JWT_EXPIRES_IN;
        const expiresInSec =
          raw && /^\d+$/.test(raw) ? Number(raw) : 60 * 60 * 24 * 7;
        return {
          secret: process.env.JWT_SECRET || 'dev-only-cambiar-en-produccion-minimo-32',
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
