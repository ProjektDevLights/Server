import { Test, TestingModule } from '@nestjs/testing';
import { LightOutGateway } from './light-out.gateway';

describe('LightOutGateway', () => {
  let gateway: LightOutGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LightOutGateway],
    }).compile();

    gateway = module.get<LightOutGateway>(LightOutGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
