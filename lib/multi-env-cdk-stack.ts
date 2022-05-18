import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {AwsCustomResource,AwsCustomResourcePolicy,PhysicalResourceId,Provider} from 'aws-cdk-lib/custom-resources';
import {Effect, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import { join } from 'path';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import {DatabaseClusterEngine, ServerlessCluster} from 'aws-cdk-lib/aws-rds'
import {Secret} from 'aws-cdk-lib/aws-secretsmanager'
import {StringParameter} from 'aws-cdk-lib/aws-ssm'

export class MultiEnvCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const checkExecutionLambda = new Function(this,'checkExecutionFunction',{
      functionName: 'checkExecutionFunction',
      runtime: Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: Code.fromAsset(join(__dirname,'..','lambda')) ,  
    });    
    const dynamoToGroupPolicy = new PolicyStatement({
      sid: "dynamoPolicy",
      effect: Effect.ALLOW,
      actions:[
        "dynamodb:Put*",
        "dynamodb:Create*",
        "dynamodb:BatchWriteItem",
        "dynamodb:Get*",
        "dynamodb:BatchGetItem",
        "dynamodb:List*",
        "dynamodb:Describe*",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:Update*",
        "dynamodb:RestoreTable*",
        "dynamodb:Delete*"
      ],
      resources:['arn:aws:dynamodb:us-east-1:913008941063:table*']
    });    
    const s3ToGroupPolicy = new PolicyStatement({
      sid: "s3Policy",
      effect: Effect.ALLOW,
      actions:[
        "s3:GetObject*",
       
      ],
      resources:['arn:aws:s3:::*/*']
    });
    checkExecutionLambda.role?.addToPrincipalPolicy(dynamoToGroupPolicy);
    checkExecutionLambda.role?.addToPrincipalPolicy(s3ToGroupPolicy);

    const table = new Table(this,'DynamoTables',{
      tableName:"BCPR-DEV-RegainAccess",
      partitionKey: { name: 'regainAccessId', type: AttributeType.STRING }
    })

  //   const dbSecretManager =  new Secret(this,`bcpr-dev-secretManager`,{
  //     description: 'Secret for Aurora DataBase', 
  //     secretName: `bcpr-dev-credential`,
  //     generateSecretString: {
  //         secretStringTemplate: JSON.stringify({                   
                 
  //                 "engine": "aurora",                       
  //                 "port": 3306,                     
  //                 "username": "AuroraAdmin",                      
  //         }),
  //         excludePunctuation:true,
  //         includeSpace:false,
  //         generateStringKey: 'password'   
          
  //     }                        
  // })
  // new StringParameter(this,'DbCredentialsArn',{
  //     parameterName: `bcpr-dev-credentials-arn`,
  //     stringValue: dbSecretManager.secretArn
  // })


  //   const dbAurora = new ServerlessCluster(this,`bcrp-dev-db`,{
  //     engine: DatabaseClusterEngine.AURORA,
      
  //     clusterIdentifier: `bcpr-dev-cluster`, // como se identifica 
  //     enableDataApi:true,
  //     defaultDatabaseName: 'MyAuroraDbServer', // nombre de la base de datos
  //     credentials: {
  //         username: dbSecretManager.secretValueFromJson('username').toString(),
  //         password:dbSecretManager.secretValueFromJson('password')
  //     }
  // })

     //Run checkExecutionLambda on Create
     const lambdaTrigger = new AwsCustomResource(this, 'StatefunctionTrigger', {
      policy: AwsCustomResourcePolicy.fromStatements([new PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: Effect.ALLOW,
        resources: [checkExecutionLambda.functionArn]
      })]),
      timeout: Duration.minutes(5),
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: checkExecutionLambda.functionName,
          InvocationType: 'Event'
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString())
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: checkExecutionLambda.functionName,
          InvocationType: 'Event'
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString())
      }
    })
    lambdaTrigger.node.addDependency(table)
  
  }
}
