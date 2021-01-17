import { Test, TestingModule } from '@nestjs/testing';
import { TcpService } from './tcp.service';

describe('TcpService', () => {
  let service: TcpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TcpService],
    }).compile();

    service = module.get<TcpService>(TcpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
