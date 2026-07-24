import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PointsModule } from '../points/points.module';
import { EventsService } from './events.service';
import { EventsAdminController } from './events-admin.controller';
import { EventsController } from './events.controller';

@Module({
  imports: [AuthModule, PointsModule],
  controllers: [EventsAdminController, EventsController],
  providers: [EventsService],
})
export class EventsModule {}
