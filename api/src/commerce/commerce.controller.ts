import {
  BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, Query, Req, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { CommerceService } from './commerce.service';
import { CommerceLoginDto } from './dto/commerce-login.dto';
import { ValidateDto } from './dto/validate.dto';
import { PurchaseDto } from './dto/purchase.dto';
import { UpdateCommerceProfileDto } from './dto/update-commerce-profile.dto';
import { CommerceChangePasswordDto } from './dto/commerce-change-password.dto';
import { CommerceGuard } from './commerce.guard';
import { CurrentCommerce } from './current-commerce.decorator';
import { isPngOrJpeg } from '../common/image-signature';
import { SESSION_COOKIE_NAME as COOKIE, sessionCookieOptions } from '../common/session-cookie';

const DAY = 24 * 60 * 60 * 1000;

@Controller('commerce')
export class CommerceController {
  constructor(private commerce: CommerceService) {}

  @Post('login')
  async login(@Body() dto: CommerceLoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, view } = await this.commerce.login(dto.email, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, sessionCookieOptions(dto.remember ? 7 * DAY : DAY));
    return view;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.commerce.logout(sid);
    res.clearCookie(COOKIE, sessionCookieOptions());
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

  @UseGuards(CommerceGuard)
  @Post('purchase')
  purchase(@CurrentCommerce() commerce: any, @Body() dto: PurchaseDto) {
    return this.commerce.registerPurchase(commerce.id, commerce.porcentajeDescuento, dto.credentialToken, dto.monto);
  }

  @UseGuards(CommerceGuard)
  @Get('usages')
  usages(@CurrentCommerce() commerce: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.commerce.listUsages(commerce.id, from, to);
  }

  @UseGuards(CommerceGuard)
  @Get('me/profile')
  getProfile(@CurrentCommerce() commerce: any) {
    return this.commerce.getProfile(commerce.id);
  }

  @UseGuards(CommerceGuard)
  @Patch('me/profile')
  updateProfile(@CurrentCommerce() commerce: any, @Body() dto: UpdateCommerceProfileDto) {
    return this.commerce.updateProfile(commerce.id, dto);
  }

  @UseGuards(CommerceGuard)
  @Post('me/password')
  async changePassword(@CurrentCommerce() commerce: any, @Body() dto: CommerceChangePasswordDto) {
    await this.commerce.changePassword(commerce.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }

  @UseGuards(CommerceGuard)
  @Post('me/logo')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadLogo(@CurrentCommerce() commerce: any, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Se requiere una imagen');
    const ALLOWED = ['image/png', 'image/jpeg'];
    if (!ALLOWED.includes(file.mimetype)) throw new BadRequestException('Formato inválido: solo PNG o JPG');
    if (!isPngOrJpeg(file.buffer)) throw new BadRequestException('Contenido de imagen inválido');
    return this.commerce.uploadLogo(commerce.id, file.buffer, file.mimetype);
  }
}
