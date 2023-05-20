import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Movie, movies } from '../../data/movies';

import { movieSchema } from '../../shared/schemas';
import { schemaValidator } from '../../shared/utils/schema-validator';

export const handler = async ({
  pathParameters,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!pathParameters?.id) throw new Error('No id found in path parameters');
    const { id } = pathParameters;

    // let's use hard coded movies for our basic example
    const movie: Movie | undefined = movies.find((item) => item.id === id);

    if (!movie) throw new Error(`Movie ${id} not found`);

    // let's optionally validate that it is the correct shape before returning
    // as if it has come from a db
    schemaValidator(movieSchema, movie);

    return {
      statusCode: 200,
      body: JSON.stringify(movie),
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
