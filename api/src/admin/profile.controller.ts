import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';

@UseGuards(SessionGuard, RolesGuard)
@Roles('admin', 'gestor')
@Controller('admin/me')
export class ProfileController {
  constructor(private profile: ProfileService) {}

  @Get()
  get(@CurrentUser() user: any) { return this.profile.get(user.id); }

  @Patch()
  update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) { return this.profile.update(user.id, dto); }

  @Post('password')
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    await this.profile.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }
}
