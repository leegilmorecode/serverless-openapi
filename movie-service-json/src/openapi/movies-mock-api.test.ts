import { getMockApiJson } from './movies-mock-api';

describe('mock-api', () => {
  it('should return the correct mock open api json', () => {
    expect(getMockApiJson()).toMatchSnapshot();
  });
});
