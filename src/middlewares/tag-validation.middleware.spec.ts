import { TagValidationMiddleware } from './tag-validation.middleware';

describe('TagValidationMiddleware', () => {
  it('should be defined', () => {
    expect(new TagValidationMiddleware()).toBeDefined();
  });
});
