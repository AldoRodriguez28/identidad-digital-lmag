import { BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import type { Student } from '@prisma/client';
import { StudentsService } from './students.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResetRequestDto } from './dto/reset-request.dto';
import { ResetConfirmDto } from './dto/reset-confirm.dto';
import { StudentGuard } from './student.guard';
import { CurrentStudent } from './current-student.decorator';
import { isPngOrJpeg } from './image-signature';

const COOKIE = process.env.SESSION_COOKIE_NAME ?? 'idsid';
const DAY = 24 * 60 * 60 * 1000;

@Controller('students')
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.students.register(dto);
  }

  @Post('login')
  async login(@Body() dto: StudentLoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, view } = await this.students.login(dto.correo, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: dto.remember ? 7 * DAY : DAY,
    });
    return view;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.students.logout(sid);
    res.clearCookie(COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return { ok: true };
  }

  @Post('password-reset/request')
  @HttpCode(201)
  async requestReset(@Body() dto: ResetRequestDto) {
    await this.students.requestReset(dto.correo);
    return { ok: true };
  }

  @Post('password-reset/confirm')
  async confirmReset(@Body() dto: ResetConfirmDto) {
    await this.students.confirmReset(dto.token, dto.password);
    return { ok: true };
  }

  @UseGuards(StudentGuard)
  @Get('me')
  me(@CurrentStudent() student: Student) {
    return this.students.toPublicView(student);
  }

  @UseGuards(StudentGuard)
  @Get('me/profile')
  getProfile(@CurrentStudent() student: any) {
    return this.students.getProfile(student.id);
  }

  @UseGuards(StudentGuard)
  @Patch('me/profile')
  updateProfile(@CurrentStudent() student: any, @Body() dto: UpdateProfileDto) {
    return this.students.updateProfile(student.id, dto);
  }

  @UseGuards(StudentGuard)
  @Post('me/ine')
  @HttpCode(200)
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'ineFrente', maxCount: 1 }, { name: 'ineReverso', maxCount: 1 }],
    { limits: { fileSize: 5 * 1024 * 1024 } },
  ))
  async uploadIne(
    @CurrentStudent() student: any,
    @UploadedFiles() files: { ineFrente?: Express.Multer.File[]; ineReverso?: Express.Multer.File[] },
  ) {
    const frente = files?.ineFrente?.[0];
    const reverso = files?.ineReverso?.[0];
    if (!frente || !reverso) throw new BadRequestException('Se requieren INE frente y reverso');
    const ALLOWED = ['image/png', 'image/jpeg'];
    if (!ALLOWED.includes(frente.mimetype) || !ALLOWED.includes(reverso.mimetype)) {
      throw new BadRequestException('Formato inválido: solo PNG o JPG');
    }
    if (!isPngOrJpeg(frente.buffer) || !isPngOrJpeg(reverso.buffer)) {
      throw new BadRequestException('Contenido de imagen inválido');
    }
    return this.students.saveIne(student.id, frente.buffer, frente.mimetype, reverso.buffer, reverso.mimetype);
  }
}
