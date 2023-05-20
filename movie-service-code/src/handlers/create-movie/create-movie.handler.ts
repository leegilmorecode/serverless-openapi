import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { Movie } from '../../data/movies';
import { v4 as uuid } from 'uuid';

export const handler = async ({
  body,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) throw new Error('No movie');

    // let's return the same movie in this example and
    // we won't commit to a datastore
    const movie: Movie = JSON.parse(body) as Movie;

    return {
      statusCode: 201,
      body: JSON.stringify({
        ...movie,
        id: uuid(),
      }),
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
