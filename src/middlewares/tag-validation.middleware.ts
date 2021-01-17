import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { UtilsService } from '../services/utils/utils.service';
import { IncomingMessage } from 'http';

@Injectable()
export class TagValidationMiddleware implements NestMiddleware {
  
    constructor (
        private utilsService: UtilsService
    ) {}
    

  async use(req: any, res: any, next: () => void) {
    if(await this.utilsService.isTagValid(req.originalUrl.split("/")[2])){
      next();
      return;
    }
    throw new NotFoundException("There is no light with this tag!");
  } 
}
