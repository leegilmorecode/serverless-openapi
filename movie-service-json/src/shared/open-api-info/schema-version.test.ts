import { version } from './schema-version';

describe('schema-version', () => {
  it('should be the correct version', () => {
    expect(version).toEqual('v1');
  });
});
