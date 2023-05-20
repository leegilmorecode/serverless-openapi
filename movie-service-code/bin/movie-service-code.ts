#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { MovieServiceCodeStack } from '../lib/movie-service-code-stack';

const app = new cdk.App();
new MovieServiceCodeStack(app, 'MovieServiceCodeStack', {
  stageName: 'prod', // we usually pass this in as stack config
});
