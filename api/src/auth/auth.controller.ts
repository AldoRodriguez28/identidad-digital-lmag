import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './session.guard';
import { CurrentUser } from './current-user.decorator';

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'idsid';
const DAY = 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, user } = await this.auth.login(dto.email, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return user;
  }

  @Post('ingresar')
  async ingresar(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, tipo, redirect } = await this.auth.loginUniversal(dto.email, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return { tipo, redirect };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.auth.logout(sid);
    res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return { ok: true };
  }

  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return { id: user.id, nombre: user.nombre, rol: user.rol };
  }
}
