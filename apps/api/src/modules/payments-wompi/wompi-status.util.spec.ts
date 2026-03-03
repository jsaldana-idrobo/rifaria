import { mapWompiStatus } from './wompi-status.util';

describe('mapWompiStatus', () => {
  it('maps approved status', () => {
    expect(mapWompiStatus('APPROVED')).toBe('approved');
  });

  it('maps declined status', () => {
    expect(mapWompiStatus('DECLINED')).toBe('declined');
  });

  it('defaults unknown statuses to pending', () => {
    expect(mapWompiStatus('ANYTHING_ELSE')).toBe('pending');
  });
});
