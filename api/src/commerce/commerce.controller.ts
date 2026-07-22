import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommerceService } from './commerce.service';
import { CommerceLoginDto } from './dto/commerce-login.dto';
import { ValidateDto } from './dto/validate.dto';
import { CommerceGuard } from './commerce.guard';
import { CurrentCommerce } from './current-commerce.decorator';

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'idsid';
const DAY = 24 * 60 * 60 * 1000;

@Controller('commerce')
export class CommerceController {
  constructor(private commerce: CommerceService) {}

  @Post('login')
  async login(@Body() dto: CommerceLoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, view } = await this.commerce.login(dto.email, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return view;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.commerce.logout(sid);
    res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return { ok: true };
  }

  @UseGuards(CommerceGuard)
  @Get('me')
  me(@CurrentCommerce() commerce: any) {
    return this.commerce.toPublicView(commerce);
  }

  @UseGuards(CommerceGuard)
  @Post('validate')
  validate(@CurrentCommerce() commerce: any, @Body() dto: ValidateDto) {
    return this.commerce.validate(commerce.id, commerce.porcentajeDescuento, dto.credentialToken);
  }
}
