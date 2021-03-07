import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagValidationMiddleware } from 'src/middlewares/tag-validation.middleware';
import { DatabaseModule } from 'src/services/database/database.module';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { Alarm, AlarmSchema } from '../../schemas/alarm.schema';
import { Esp, EspSchema } from '../../schemas/esp.schema';
import { TcpModule } from '../../services/tcp/tcp.module';
import { UtilsService } from '../../services/utils/utils.service';
import { ColorService } from './color/color.service';
import { ControlService } from './control/control.service';
import { GeneralService } from './general/general.service';
import { SettingsService } from './settings/settings.service';
import { TagsController } from './tags.controller';

@Module({
  controllers: [TagsController],
  providers: [ColorService, ControlService, UtilsService, GeneralService, SettingsService],
  imports: [ DatabaseModule, TcpModule, MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }, { name: Alarm.name, schema: AlarmSchema }])]
})
export class TagsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TagValidationMiddleware).forRoutes({ path: "/tags/:tag(.*)", method: RequestMethod.ALL });
  }
} 
