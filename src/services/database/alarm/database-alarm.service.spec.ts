import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseAlarmService } from './database-alarm.service';

describe('DatabaseAlarmService', () => {
  let service: DatabaseAlarmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseAlarmService],
    }).compile();

    service = module.get<DatabaseAlarmService>(DatabaseAlarmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
