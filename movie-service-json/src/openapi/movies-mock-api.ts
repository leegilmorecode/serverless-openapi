import { movies } from '../data';
import { version } from '../shared/open-api-info/schema-version';

export const getMockApiJson = () => {
  return {
    openapi: '3.0.3',
    'x-amazon-apigateway-request-validators': {
      validation: {
        validateRequestBody: true,
        validateRequestParameters: true,
      },
    },
    info: {
      title: 'Movie Mock API Example',
      version,
      description: 'A Mock API for movies',
    },
    paths: {
      [`/${version}/movies`]: {
        get: {
          'x-amazon-apigateway-request-validator': 'validation',
          summary: 'Get all movies',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Movie' },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
          'x-amazon-apigateway-integration': {
            type: 'mock',
            requestTemplates: {
              'application/json': '{"statusCode": 200}',
            },
            responses: {
              default: {
                statusCode: '200',
                responseTemplates: {
                  'application/json': JSON.stringify(movies),
                },
              },
            },
          },
        },
        post: {
          'x-amazon-apigateway-request-validator': 'validation',
          summary: 'Create a new movie',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewMovie' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Movie' },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
          'x-amazon-apigateway-integration': {
            type: 'mock',
            requestTemplates: {
              'application/json':
                '#set($context.requestOverride.path.body = $input.body)\n{\n  "statusCode": 200,\n}',
            },
            responses: {
              default: {
                statusCode: '200',
                responseTemplates: {
                  'application/json':
                    '#set($body = $util.parseJson($context.requestOverride.path.body))\n{"id": "c4887ba4-0782-471c-bddc-af50265c96b9",\n "title": "$body.title",\n "rating": "$body.rating",\n "year": "$body.year"\n}',
                },
              },
            },
          },
        },
      },
      [`/${version}/movies/{id}`]: {
        get: {
          'x-amazon-apigateway-request-validator': 'validation',
          summary: 'Get a movie by id',
          parameters: {
            name: 'id',
            in: 'path',
            description: 'ID of the movie',
            required: true,
            schema: { type: 'string' },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Movie' },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Not Found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
          'x-amazon-apigateway-integration': {
            type: 'mock',
            requestTemplates: {
              'application/json': '{"statusCode": 200}',
            },
            responses: {
              default: {
                statusCode: '200',
                responseTemplates: {
                  'application/json': JSON.stringify(movies[0]),
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string' } },
        },
        NewMovie: {
          type: 'object',
          required: ['title', 'year', 'rating'],
          properties: {
            title: {
              type: 'string',
              pattern: '^[a-zA-Z0-9 ]*$',
              minLength: 1,
              maxLength: 100,
              description:
                'The movie title (alphanumeric characters and spaces only)',
            },
            year: {
              type: 'string',
              pattern: '^\\d{4}$',
              description: 'The release year of the movie',
            },
            rating: {
              type: 'string',
              enum: ['U', 'PG', '12', '15', '18'],
              pattern: '^[UPG]|1[258]$',
              description: 'The rating of the movie',
            },
          },
        },
        Movie: {
          type: 'object',
          required: ['id', 'title', 'year', 'rating'],
          properties: {
            id: {
              type: 'string',
              pattern:
                '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
              description: 'The movie ID (numeric characters only)',
            },
            title: {
              type: 'string',
              pattern: '^[a-zA-Z0-9 ]*$',
              minLength: 1,
              maxLength: 100,
              description:
                'The movie title (alphanumeric characters and spaces only)',
            },
            year: {
              type: 'string',
              pattern: '^\\d{4}$',
              description: 'The release year of the movie',
            },
            rating: {
              type: 'string',
              enum: ['U', 'PG', '12', '15', '18'],
              pattern: '^[UPG]|1[258]$',
              description: 'The rating of the movie',
            },
          },
        },
      },
    },
  };
};
