import { EspMiddleware } from './esp.middleware';

describe('EspMiddleware', () => {
  it('should be defined', () => {
    expect(new EspMiddleware()).toBeDefined();
  });
});
