import { AlarmValidationMiddleware } from './alarm-validation.middleware';

describe('AlarmValidationMiddleware', () => {
  it('should be defined', () => {
    expect(new AlarmValidationMiddleware()).toBeDefined();
  });
});
