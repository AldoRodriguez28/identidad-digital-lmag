import { Body, Controller, Post } from '@nestjs/common';
import { StudentsService } from './students.service';
import { RegisterStudentDto } from './dto/register-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.students.register(dto);
  }
}
