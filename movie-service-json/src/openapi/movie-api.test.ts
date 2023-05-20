import { getApiJson, getApiJsonRedacted } from './movies-api';

describe('get-api-json', () => {
  it('should return the correct json', () => {
    expect(getApiJson('account-id')).toMatchSnapshot();
  });

  it('should return the redacted version of the json', () => {
    expect(getApiJsonRedacted('account-id')).toMatchSnapshot();
  });
});
