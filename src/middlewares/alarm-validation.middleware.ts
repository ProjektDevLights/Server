import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { UtilsService } from '../services/utils/utils.service';

@Injectable()
export class AlarmValidationMiddleware implements NestMiddleware {
  
    constructor (
        private utilsService: UtilsService
    ) {}
    

  async use(req: any, res: any, next: () => void) {
    if(await this.utilsService.isAlarmIdValid(req.originalUrl.split("/")[2])){
      next(); 
      return;
    }
    throw new NotFoundException("There is no alarm with this ID!");
  } 
}
