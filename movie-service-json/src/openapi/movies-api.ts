import { errorResponse, movieSchema } from '../shared/schemas/';

import { createMovieSchema } from '../handlers/create-movie/create-movie.schema';
import { functionNames } from '../shared/function-names/function-names';
import { version } from '../shared/open-api-info/schema-version';

type JSONValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JSONValue;
}
type JsonArray = JSONValue[];

// redact properties from a dynamic json object
function deletePropertyRecursively(
  obj: JsonObject,
  parentPropertyName: string
): void {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      if (key === parentPropertyName) {
        delete obj[key];
      } else {
        deletePropertyRecursively(obj[key] as JsonObject, parentPropertyName);
      }
    }
  }
}

function removeDynamicObjects(
  json: JsonObject,
  parentPropertyName: string
): JsonObject {
  for (const key in json) {
    if (typeof json[key] === 'object') {
      deletePropertyRecursively(json[key] as JsonObject, parentPropertyName);
    }
  }

  return json;
}

// redact properties from a dynamic json schema i.e. the 'x-amazon-apigateway-integration' values
// as we don't want to leak this information to people viewing our openapi spec online
export const getApiJsonRedacted = (accountId: string): Record<string, any> => {
  const json: Record<string, any> = getApiJson(accountId);
  return removeDynamicObjects(json, 'x-amazon-apigateway-integration');
};

// get the raw api json for our integrations
export const getApiJson = (accountId: string): Record<string, any> => {
  return {
    openapi: '3.0.3',
    'x-amazon-apigateway-request-validators': {
      validation: {
        validateRequestBody: true,
        validateRequestParameters: true,
      },
    },
    info: {
      title: 'Movie API Example',
      version,
      description: 'An API for movies',
    },
    paths: {
      [`/${version}/movies`]: {
        get: {
          'x-amazon-apigateway-request-validator': 'validation',
          'x-amazon-apigateway-integration': {
            type: 'aws_proxy',
            httpMethod: 'POST',
            uri: {
              'Fn::Sub': `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${functionNames.listMovies}.Arn}/invocations`,
            },
            passthroughBehavior: 'when_no_match',
            credentials: `arn:aws:iam::${accountId}:role/apiRole`,
            responses: {
              default: {
                statusCode: '200',
                responseTemplates: {
                  'application/json': '',
                },
              },
            },
          },
          summary: 'Get all movies',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Movie',
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        },
        post: {
          'x-amazon-apigateway-request-validator': 'validation',
          'x-amazon-apigateway-integration': {
            type: 'aws_proxy',
            httpMethod: 'POST',
            uri: {
              'Fn::Sub': `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${functionNames.createMovie}.Arn}/invocations`,
            },
            passthroughBehavior: 'when_no_match',
            credentials: `arn:aws:iam::${accountId}:role/apiRole`,
            responses: {
              default: {
                statusCode: '200',
                responseTemplates: {
                  'application/json': '',
                },
              },
            },
          },
          summary: 'Create a new movie',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/NewMovie',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Movie',
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      [`/${version}/movies/{id}`]: {
        get: {
          'x-amazon-apigateway-request-validator': 'validation',
          'x-amazon-apigateway-integration': {
            type: 'aws_proxy',
            httpMethod: 'POST',
            uri: {
              'Fn::Sub': `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${functionNames.getMovieById}.Arn}/invocations`,
            },
            passthroughBehavior: 'when_no_match',
            credentials: `arn:aws:iam::${accountId}:role/apiRole`,
            responses: {
              default: {
                statusCode: '200',
                responseTemplates: {
                  'application/json': '',
                },
              },
            },
          },
          summary: 'Get a movie by id',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'ID of the movie',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Movie',
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: errorResponse,
        NewMovie: createMovieSchema,
        Movie: movieSchema,
      },
    },
  };
};
