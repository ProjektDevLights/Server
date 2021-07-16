import { Test, TestingModule } from '@nestjs/testing';
import { AlarmOutGateway } from './alarm-out.gateway';

describe('AlarmOutGateway', () => {
  let gateway: AlarmOutGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlarmOutGateway],
    }).compile();

    gateway = module.get<AlarmOutGateway>(AlarmOutGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
