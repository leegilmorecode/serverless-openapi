import { functionNames } from './function-names';

describe('function-names', () => {
  it('should have the correct function name properties', () => {
    expect(functionNames).toMatchInlineSnapshot(`
{
  "createMovie": "CreateMovieLambda",
  "getMovieById": "GetMovieByIdLambda",
  "listMovies": "ListMoviesLambda",
}
`);
  });
});
