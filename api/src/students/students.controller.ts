import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Student } from '@prisma/client';
import { StudentsService } from './students.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StudentGuard } from './student.guard';
import { CurrentStudent } from './current-student.decorator';

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
}
