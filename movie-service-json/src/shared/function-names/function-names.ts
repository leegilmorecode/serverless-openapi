// we want to ensure that we don't have any mistakes made
// between the open-api spec and the functions in cdk code
export enum functionNames {
  createMovie = 'CreateMovieLambda',
  getMovieById = 'GetMovieByIdLambda',
  listMovies = 'ListMoviesLambda',
}
