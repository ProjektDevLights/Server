import { Test, TestingModule } from '@nestjs/testing';
import { LightsController } from './lights.controller';

describe('LightsController', () => {
  let controller: LightsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LightsController],
    }).compile();

    controller = module.get<LightsController>(LightsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
