#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { MovieServiceStack } from '../lib/movie-service-stack';

const app = new cdk.App();
new MovieServiceStack(app, 'MovieServiceStackJson', {
  stageName: 'prod', // we usually pass this in as stack config
});
