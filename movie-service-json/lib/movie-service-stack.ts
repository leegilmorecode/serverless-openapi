import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { getApiJson, getApiJsonRedacted } from '../src/openapi/movies-api';

import { Construct } from 'constructs';
import { functionNames } from '../src/shared/function-names/function-names';
import { getMockApiJson } from '../src/openapi/movies-mock-api';
import { version } from '../src/shared/open-api-info/schema-version';

interface MovieServiceStackProps extends StackProps {
  stageName: string;
}

export class MovieServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: MovieServiceStackProps) {
    super(scope, id, props);

    // stack configuration values
    const accountId: string = Stack.of(this).account;
    const stageName = props.stageName;

    // we create an api service role for api gateway
    const apiRole: Role = new Role(this, 'apiRole', {
      roleName: 'apiRole',
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

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
    const forceListMoviesLambdaId = listMoviesLambda.node
      .defaultChild as lambda.CfnFunction;
    forceListMoviesLambdaId.overrideLogicalId(functionNames.listMovies);

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
    const forceGetMovieByIdLambdaId = getMovieLambda.node
      .defaultChild as lambda.CfnFunction;
    forceGetMovieByIdLambdaId.overrideLogicalId(functionNames.getMovieById);

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
    const forceCreateMovieLambdaId = createMovieLambda.node
      .defaultChild as lambda.CfnFunction;
    forceCreateMovieLambdaId.overrideLogicalId(functionNames.createMovie);

    // Grant the apiRole permissions to invoke this Lambda
    // through a lambda integration
    listMoviesLambda.grantInvoke(apiRole);
    getMovieLambda.grantInvoke(apiRole);
    createMovieLambda.grantInvoke(apiRole);

    // we create the specRestApi which builds all of our
    // lambda integrations for us, as well as adding the basic
    // schema validation etc
    const api: apigw.SpecRestApi = new apigw.SpecRestApi(this, 'Api', {
      apiDefinition: apigw.ApiDefinition.fromInline(getApiJson(accountId)), // the getApiJson function returns our open api json
      deploy: false,
      endpointTypes: [apigw.EndpointType.REGIONAL],
      description: `Movies API ${stageName}`,
    });

    // create the mock api for development teams to consume
    const mockApi: apigw.SpecRestApi = new apigw.SpecRestApi(this, 'MockApi', {
      apiDefinition: apigw.ApiDefinition.fromInline(getMockApiJson()),
      deploy: true, // the getMockApiJson function returns our mock open api json
      deployOptions: {
        stageName: 'api',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
      },
      endpointTypes: [apigw.EndpointType.REGIONAL],
      description: `Movies Mock API ${stageName}`,
    });
    mockApi.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // we create some documentation which will be pushed to apigw
    const documentation = new apigw.CfnDocumentationVersion(
      this,
      'ApiDocumentation' + version, // this ensures we get a new version each time
      {
        restApiId: api.restApiId,
        documentationVersion: version,
        description: 'api schema',
      }
    );
    documentation.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // we create a deployment for the api for a given stage
    const deployment = api.latestDeployment
      ? api.latestDeployment
      : new apigw.Deployment(this, 'Deployment', {
          api: api,
          description: 'Latest Deployment',
          retainDeployments: false,
        });
    deployment.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // create stage of api with documentation version
    const stage = new apigw.Stage(this, 'ApiStage', {
      deployment: deployment,
      documentationVersion: version,
      stageName: 'api',
      loggingLevel: apigw.MethodLoggingLevel.INFO,
    });
    stage.applyRemovalPolicy(RemovalPolicy.DESTROY);
    stage.node.addDependency(documentation);

    // the bucket which will house swagger ui and our openapi spec
    const bucket: s3.Bucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: 'serverless-pro-openapi-bucket-json',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html', // this is our swagger ui main file
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
    });

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
        comment: `${props.stageName} api distribution (open-api)`,
        defaultRootObject: 'index.html',
        priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
        enabled: true,
      }
    );
    cloudFrontDistribution.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Setup Bucket Deployment to automatically deploy new openapi spec
    new s3deploy.BucketDeployment(this, 'ClientBucketDeployment', {
      sources: [
        // deploy our open api json data
        s3deploy.Source.jsonData(
          'movies-openapi.json',
          getApiJsonRedacted(accountId) // this removes our integration content
        ),
        // deploy the raw swagger-ui setup
        s3deploy.Source.asset('src/swagger-ui/dist/'),
      ],
      destinationBucket: bucket,
    });
  }
}
