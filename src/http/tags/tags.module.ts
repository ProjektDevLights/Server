import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ColorService } from './color/color.service';
import { TagsController } from './tags.controller';
import { ControlService } from './control/control.service';
import { UtilsService } from '../../services/utils/utils.service';
import { TagValidationMiddleware } from 'src/middlewares/tag-validation.middleware';
import { MongooseModule } from '@nestjs/mongoose';
import { Esp, EspSchema } from '../../schemas/esp.schema';
import { Alarm, AlarmSchema } from '../../schemas/alarm.schema';
import { TcpModule } from '../../services/tcp/tcp.module';
import { GeneralService } from './general/general.service';

@Module({
  controllers: [TagsController],
  providers: [ColorService, ControlService, UtilsService, GeneralService],
  imports: [TcpModule,  MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }, { name: Alarm.name, schema: AlarmSchema }])]
})
export class TagsModule {
  configure(consumer: MiddlewareConsumer) { 
    consumer.apply(TagValidationMiddleware).forRoutes({path: "/tags/:tag(.*)", method: RequestMethod.ALL});  
  }
} 
