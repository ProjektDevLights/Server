import { Test, TestingModule } from '@nestjs/testing';
import { EspService } from './esp.service';

describe('EspService', () => {
  let service: EspService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EspService],
    }).compile();

    service = module.get<EspService>(EspService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
