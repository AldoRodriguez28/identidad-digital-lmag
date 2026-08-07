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
import { isPngOrJpeg } from '../common/image-signature';
import { PointsService } from '../points/points.service';
import { SESSION_COOKIE_NAME as COOKIE, sessionCookieOptions } from '../common/session-cookie';

const DAY = 24 * 60 * 60 * 1000;

@Controller('students')
export class StudentsController {
  constructor(private students: StudentsService, private points: PointsService) {}

  private assertValidIneFile(file: Express.Multer.File | undefined, side: 'frente' | 'reverso'): asserts file is Express.Multer.File {
    if (!file) throw new BadRequestException(`Falta la imagen del INE (${side})`);
    const ALLOWED = ['image/png', 'image/jpeg'];
    if (!ALLOWED.includes(file.mimetype)) throw new BadRequestException(`Formato inválido en el INE (${side}): solo PNG o JPG`);
    if (!isPngOrJpeg(file.buffer)) throw new BadRequestException(`Contenido de imagen inválido en el INE (${side})`);
  }

  @Post('register')
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'ineFrente', maxCount: 1 }, { name: 'ineReverso', maxCount: 1 }],
    { limits: { fileSize: 5 * 1024 * 1024 } },
  ))
  async register(
    @Body() dto: RegisterStudentDto,
    @UploadedFiles() files: { ineFrente?: Express.Multer.File[]; ineReverso?: Express.Multer.File[] },
    @Res({ passthrough: true }) res: Response,
  ) {
    const frente = files?.ineFrente?.[0];
    const reverso = files?.ineReverso?.[0];
    this.assertValidIneFile(frente, 'frente');
    this.assertValidIneFile(reverso, 'reverso');

    const { session, view } = await this.students.register(dto, {
      frente: { buffer: frente.buffer, mimetype: frente.mimetype },
      reverso: { buffer: reverso.buffer, mimetype: reverso.mimetype },
    });
    res.cookie(COOKIE, session.id, sessionCookieOptions(DAY));
    return view;
  }

  @Post('login')
  async login(@Body() dto: StudentLoginDto, @Res({ passthrough: true }) res: Response) {
    const { session, view } = await this.students.login(dto.correo, dto.password, !!dto.remember);
    res.cookie(COOKIE, session.id, sessionCookieOptions(dto.remember ? 7 * DAY : DAY));
    return view;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE];
    if (sid) await this.students.logout(sid);
    res.clearCookie(COOKIE, sessionCookieOptions());
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
  @Get('me/points')
  getPoints(@CurrentStudent() student: any) {
    return this.points.getSummary(student.id);
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
    this.assertValidIneFile(frente, 'frente');
    this.assertValidIneFile(reverso, 'reverso');
    return this.students.saveIne(student.id, frente.buffer, frente.mimetype, reverso.buffer, reverso.mimetype);
  }
}
