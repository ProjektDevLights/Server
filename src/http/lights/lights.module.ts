import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LightsController } from './lights.controller';
import { ColorService } from './color/color.service';
import { SettingsService } from './settings/settings.service';
import { ControlService } from './control/control.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Esp, EspSchema } from '../../schemas/esp.schema';
import { Alarm, AlarmSchema } from '../../schemas/alarm.schema';
import { UtilsService } from '../../services/utils/utils.service';
import { LightValidationMiddleware } from 'src/middlewares/light-validation.middleware';
import { GeneralService } from './general/general.service';
import { TcpModule } from '../../services/tcp/tcp.module';

@Module({ 
  controllers: [LightsController],
  providers: [ColorService, SettingsService, ControlService, UtilsService, GeneralService],
  imports: [TcpModule, MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }])]
})

export class LightsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LightValidationMiddleware).forRoutes({path: "/lights/:light(.*)", method: RequestMethod.ALL});  
  } 
}
