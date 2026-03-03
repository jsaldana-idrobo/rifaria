import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('rejects refresh tokens on access strategy', () => {
    const strategy = new JwtStrategy({
      get: jest.fn().mockReturnValue('test-access-secret')
    } as never);

    expect(() =>
      strategy.validate({
        sub: 'user_1',
        email: 'owner@rifaria.local',
        role: 'owner',
        tokenType: 'refresh' as never
      })
    ).toThrow(UnauthorizedException);
  });

  it('accepts access tokens', () => {
    const strategy = new JwtStrategy({
      get: jest.fn().mockReturnValue('test-access-secret')
    } as never);

    expect(
      strategy.validate({
        sub: 'user_1',
        email: 'owner@rifaria.local',
        role: 'owner',
        tokenType: 'access'
      })
    ).toEqual({
      sub: 'user_1',
      email: 'owner@rifaria.local',
      role: 'owner',
      tokenType: 'access'
    });
  });
});
