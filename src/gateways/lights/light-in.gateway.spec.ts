import { Test, TestingModule } from '@nestjs/testing';
import { LightInGateway } from './light-in.gateway';

describe('LightInGateway', () => {
  let gateway: LightInGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LightInGateway],
    }).compile();

    gateway = module.get<LightInGateway>(LightInGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
