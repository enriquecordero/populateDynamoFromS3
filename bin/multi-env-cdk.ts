#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MultiEnvCdkStack } from '../lib/multi-env-cdk-stack';

const app = new cdk.App();
new MultiEnvCdkStack(app, 'MultiEnvCdkStack', {

});