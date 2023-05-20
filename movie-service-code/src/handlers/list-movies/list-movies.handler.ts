import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { movieSchema } from '../../shared/schemas';
import { movies } from '../../data/movies';
import { schemaValidator } from '../../shared/utils/schema-validator';

export const handler =
  async ({}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // let's hard code the movie values for now for this simple example
      // let's also validate that they are all the correct shape (as if it has come from the db)
      movies.forEach((movie) => schemaValidator(movieSchema, movie));

      return {
        statusCode: 200,
        body: JSON.stringify(movies),
      };
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) errorMessage = error.message;
      console.error(errorMessage);

      return {
        statusCode: 400,
        body: JSON.stringify({ message: errorMessage }),
      };
    }
  };
