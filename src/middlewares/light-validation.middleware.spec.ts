import { LightValidationMiddleware } from './light-validation.middleware';

describe('LightValidationMiddleware', () => {
  it('should be defined', () => {
    expect(new LightValidationMiddleware()).toBeDefined();
  });
});
