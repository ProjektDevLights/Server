import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseEspService } from './database-esp.service';

describe('DatabaseEspService', () => {
  let service: DatabaseEspService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseEspService],
    }).compile();

    service = module.get<DatabaseEspService>(DatabaseEspService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
