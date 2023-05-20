import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

import {
  CustomResource,
  Duration,
  RemovalPolicy,
  StackProps,
} from 'aws-cdk-lib';

import { Construct } from 'constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { movies } from '../src/data';
import { v4 as uuid } from 'uuid';
import { version } from '../src/shared/open-api-info/schema-version';

interface MovieServiceStackProps extends StackProps {
  stageName: string;
}

export class MovieServiceCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MovieServiceStackProps) {
    super(scope, id, props);

    // stack configuration values
    const stageName = props.stageName;

    // list movies lambda handler
    const listMoviesLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'ListMoviesLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          '../src/handlers/list-movies/list-movies.handler.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
      });

    // get movie lambda handler
    const getMovieLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'GetMovieLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          '../src/handlers/get-movie/get-movie.handler.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
      });

    // create movie lambda handler
    const createMovieLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateMovieLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          '../src/handlers/create-movie/create-movie.handler.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
      });

    // create and publish open api spec handler (custom resource)
    const publishOpenApiSpecLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'PublishOpenApiSpecLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          '../src/handlers/publish-openapi-spec/publish-openapi-spec.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        timeout: Duration.minutes(15),
        bundling: {
          minify: true,
        },
        environment: {},
      });

    // the bucket which will house swagger ui and our openapi spec
    const bucket: s3.Bucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: 'serverless-pro-openapi-bucket-code',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html', // this is our swagger ui main file
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
    });

    // create the rest api through code integrations
    const moviesApi: apigw.RestApi = new apigw.RestApi(this, 'MoviesApi', {
      description: 'An API for movies (Code)',
      endpointTypes: [apigw.EndpointType.REGIONAL],
      retainDeployments: false,
      deploy: true,
      deployOptions: {
        stageName: 'api',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
      },
    });

    new apigw.CfnDocumentationPart(this, 'MoviesApiPart', {
      location: {
        type: 'API',
      },
      properties: JSON.stringify({
        info: {
          description: 'An API for movies (Code)',
        },
      }),
      restApiId: moviesApi.restApiId,
    });

    // create our mock api
    const moviesMockApi = new apigw.RestApi(this, 'MoviesMockApi', {
      description: 'A Mock API for movies (Code)',
      deploy: true,
      endpointTypes: [apigw.EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'api',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
      },
    });

    // add our prod service resources
    const moviesRootVersion: apigw.Resource =
      moviesApi.root.addResource(version);

    const moviesResource: apigw.Resource =
      moviesRootVersion.addResource('movies');
    const movieResource: apigw.Resource = moviesResource.addResource('{id}');

    // add our mock service resources
    const moviesMockRootVersion: apigw.Resource =
      moviesMockApi.root.addResource(version);

    const moviesMockResource: apigw.Resource =
      moviesMockRootVersion.addResource('movies');
    const movieMockResource: apigw.Resource =
      moviesMockResource.addResource('{id}');

    // add our api models
    const movieModel = new apigw.Model(this, 'Movie', {
      restApi: moviesApi,
      contentType: 'application/json',
      modelName: 'Movie',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        required: ['id', 'rating', 'title', 'year'],
        properties: {
          id: {
            type: apigw.JsonSchemaType.STRING,
            description: 'The movie ID (numeric characters only)',
            pattern:
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
          },
          year: {
            type: apigw.JsonSchemaType.STRING,
            description: 'The release year of the movie',
            pattern: '^\\d{4}$',
          },
          rating: {
            type: apigw.JsonSchemaType.STRING,
            description: 'The rating of the movie',
            pattern: '^[UPG]|1[258]$',
            enum: ['U', 'PG', '12', '15', '18'],
          },
          title: {
            type: apigw.JsonSchemaType.STRING,
            maxLength: 100,
            minLength: 1,
            pattern: '^[a-zA-Z0-9 ]*$',
            description:
              'The movie title (alphanumeric characters and spaces only)',
          },
        },
      },
    });

    const arrayOfMoviesModel = new apigw.Model(this, 'ArrayOfMovies', {
      restApi: moviesApi,
      contentType: 'application/json',
      modelName: 'ArrayOfMovies',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.ARRAY,
        items: {
          ref: `https://apigateway.amazonaws.com/restapis/${moviesApi.restApiId}/models/${movieModel.modelId}`,
        },
      },
    });

    const newMovieModel = new apigw.Model(this, 'NewMovie', {
      restApi: moviesApi,
      contentType: 'application/json',
      modelName: 'NewMovie',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        required: ['rating', 'title', 'year'],
        properties: {
          year: {
            type: apigw.JsonSchemaType.STRING,
            description: 'The release year of the movie',
            pattern: '^\\d{4}$',
          },
          rating: {
            type: apigw.JsonSchemaType.STRING,
            description: 'The rating of the movie',
            pattern: '^[UPG]|1[258]$',
            enum: ['U', 'PG', '12', '15', '18'],
          },
          title: {
            type: apigw.JsonSchemaType.STRING,
            maxLength: 100,
            minLength: 1,
            pattern: '^[a-zA-Z0-9 ]*$',
            description:
              'The movie title (alphanumeric characters and spaces only)',
          },
        },
      },
    });

    const errorResponseModel = new apigw.Model(this, 'ErrorResponse', {
      restApi: moviesApi,
      contentType: 'application/json',
      modelName: 'ErrorResponse',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        required: ['message'],
        properties: {
          message: {
            type: apigw.JsonSchemaType.STRING,
          },
        },
      },
    });

    // create our request validator
    const requestValidator = new apigw.RequestValidator(
      this,
      'RequestValidator',
      {
        requestValidatorName: 'RequestValidator',
        restApi: moviesApi,
        validateRequestBody: true,
        validateRequestParameters: true,
      }
    );

    // add our methods to the prod api
    moviesResource.addMethod(
      'GET',
      new apigw.LambdaIntegration(listMoviesLambda, {
        proxy: true,
      }),
      {
        requestValidator,
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': arrayOfMoviesModel,
            },
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': errorResponseModel,
            },
          },
        ],
      }
    );

    new apigw.CfnDocumentationPart(this, 'ListMoviesDocPart', {
      location: {
        method: 'GET',
        path: `/${version}/movies`,
        type: 'METHOD',
      },
      properties: JSON.stringify({
        summary: 'Get all movies',
      }),
      restApiId: moviesApi.restApiId,
    });

    moviesResource.addMethod(
      'POST',
      new apigw.LambdaIntegration(createMovieLambda, {
        proxy: true,
      }),
      {
        requestValidator,
        requestModels: {
          'application/json': newMovieModel,
        },
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': movieModel,
            },
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': errorResponseModel,
            },
          },
        ],
      }
    );

    new apigw.CfnDocumentationPart(this, 'CreateMovieDocPart', {
      location: {
        method: 'POST',
        path: `/${version}/movies`,
        type: 'METHOD',
      },
      properties: JSON.stringify({
        summary: 'Create a new movie',
      }),
      restApiId: moviesApi.restApiId,
    });

    movieResource.addMethod(
      'GET',
      new apigw.LambdaIntegration(getMovieLambda, {
        proxy: true,
      }),
      {
        requestValidator,
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': movieModel,
            },
          },
          {
            statusCode: '404',
            responseModels: {
              'application/json': errorResponseModel,
            },
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': errorResponseModel,
            },
          },
        ],
      }
    );

    new apigw.CfnDocumentationPart(this, 'GetMovieDocPart', {
      location: {
        method: 'GET',
        path: `/${version}/movies/{id}`,
        type: 'METHOD',
      },
      properties: JSON.stringify({
        summary: 'Get a movie by id',
      }),
      restApiId: moviesApi.restApiId,
    });

    // add our methods to the mock api
    moviesMockResource.addMethod(
      'GET',
      new apigw.MockIntegration({
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: {
          'application/json': '{ "statusCode": 200 }',
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify(movies),
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
          {
            statusCode: '400',
          },
        ],
      }
    );

    moviesMockResource.addMethod(
      'POST',
      new apigw.MockIntegration({
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: {
          'application/json':
            '#set($context.requestOverride.path.body = $input.body)\n{\n  "statusCode": 200,\n}',
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json':
                '#set($body = $util.parseJson($context.requestOverride.path.body))\n{"id": "c4887ba4-0782-471c-bddc-af50265c96b9",\n "title": "$body.title",\n "rating": "$body.rating",\n "year": "$body.year"\n}',
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
          {
            statusCode: '400',
          },
        ],
      }
    );

    movieMockResource.addMethod(
      'GET',
      new apigw.MockIntegration({
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: {
          'application/json': '{ "statusCode": 200 }',
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify(movies[0]),
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
          {
            statusCode: '404',
          },
          {
            statusCode: '400',
          },
        ],
      }
    );

    // we create some documentation which will be pushed to apigw
    const documentation = new apigw.CfnDocumentationVersion(
      this,
      'ApiDocumentation' + version, // this ensures we get a new version each time
      {
        restApiId: moviesApi.restApiId,
        documentationVersion: version,
        description: 'api schema',
      }
    );
    documentation.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // origin access identity for cloudfront and the s3 bucket
    // which means that public access of the openapi spec must be
    // via the cloudfront distribution and not direct to the bucket
    const originAccessIdentity = new cloudFront.OriginAccessIdentity(
      this,
      'OAI',
      {
        comment: `Origin Access Identity for ${stageName} openapi bucket`,
      }
    );
    originAccessIdentity.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // cloudfront distribution for the openapi spec which is public i.e. no auth for this example
    const cloudFrontDistribution = new cloudFront.CloudFrontWebDistribution(
      this,
      'Distribution',
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: bucket,
              originAccessIdentity,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                defaultTtl: Duration.minutes(0), // we set the cache values so there is no caching
                minTtl: Duration.minutes(0),
                maxTtl: Duration.minutes(0),
              },
            ],
          },
        ],
        comment: `${props.stageName} api distribution (code)`,
        defaultRootObject: 'index.html',
        priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
        enabled: true,
      }
    );
    cloudFrontDistribution.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Setup Bucket Deployment to automatically deploy new openapi spec
    new s3deploy.BucketDeployment(this, 'ClientBucketDeployment', {
      sources: [
        // deploy the raw swagger-ui setup
        s3deploy.Source.asset('src/swagger-ui/dist/'),
      ],
      destinationBucket: bucket,
      // we want to ensure that this doesn't remove the openapi spec which the custom resource just created
      prune: false,
    });

    // create our custom resource which will pull down the generated
    // openapi spec and push it to the s3 bucket with the correct name
    const provider: cr.Provider = new cr.Provider(
      this,
      'PublishOpenApiSpecCustomResource',
      {
        onEventHandler: publishOpenApiSpecLambda,
        logRetention: logs.RetentionDays.ONE_DAY,
        providerFunctionName: `publish-openapi-${props.stageName}-cr-lambda`,
      }
    );

    // use the custom resource provider
    const customResource = new CustomResource(
      this,
      `OpenApiSpecCustomResource`,
      {
        serviceToken: provider.serviceToken,
        removalPolicy: RemovalPolicy.DESTROY,
        properties: {
          version,
          restApiId: moviesApi.restApiId,
          bucket: bucket.bucketName,
          stageName: 'api',
          deploymentId: moviesApi.latestDeployment?.deploymentId,
          // force the custom resource to run on every stack deploy so the openapi spec is always up to date
          changeId: uuid(),
        },
      }
    );

    // ensure the custom resource lambda can get the current rest api and export it as openapi json
    publishOpenApiSpecLambda.addToRolePolicy(
      new PolicyStatement({
        resources: [
          `arn:aws:apigateway:eu-west-1::/restapis/${moviesApi.restApiId}/stages/api/exports/*`,
          `arn:aws:apigateway:eu-west-1::/restapis/${moviesApi.restApiId}/stages/api`,
        ],
        actions: ['apigateway:GET'],
      })
    );
    bucket.grantReadWrite(publishOpenApiSpecLambda);

    customResource.node.addDependency(moviesApi);
  }
}
