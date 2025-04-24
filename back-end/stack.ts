import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const trainingBucketName = process.env.TRAINING_BUCKET_NAME
const runtime = cdk.aws_lambda.Runtime.NODEJS_20_X
// const architecture = cdk.aws_lambda.Architecture.ARM_64
export class MatefaceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const bucket = new cdk.aws_s3.Bucket(this, 'MatefaceModelsBucket', {
            bucketName: trainingBucketName,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })

        const requestTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            'RequestTrainingLambda',
            {
                entry: path.join(
                    __dirname,
                    './api/handlers/requestTraining.ts'
                ),
                handler: 'handler',
                runtime,
                environment: {
                    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN!,
                },
                // architecture,
                timeout: cdk.Duration.seconds(300),
            }
        )

        const requestTrainingLambdaDefinition =
            new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                this,
                'RequestTrainingLambdaDefinition',
                {
                    lambdaFunction: requestTrainingLambda,
                    payload:
                        cdk.aws_stepfunctions.TaskInput.fromJsonPathAt('$'),
                }
            )

        const trainingStateMachine = new cdk.aws_stepfunctions.StateMachine(
            this,
            'TrainingStateMachine',
            {
                definition: requestTrainingLambdaDefinition,
                stateMachineName: 'TrainingStateMachine',
            }
        )

        const invokeTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            'InvokeTrainingLambda',
            {
                entry: path.join(__dirname, './api/handlers/invokeTraining.ts'),
                handler: 'handler',
                environment: {
                    STATE_MACHINE_ARN: trainingStateMachine.stateMachineArn,
                    TRAINING_BUCKET_NAME: process.env.TRAINING_BUCKET_NAME!,
                },
                runtime,
                // architecture,
            }
        )

        invokeTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['s3:*'],
                resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
            })
        )

        invokeTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['states:StartExecution'],
                resources: [trainingStateMachine.stateMachineArn],
            })
        )

        const api = new cdk.aws_apigatewayv2.HttpApi(this, 'MatefaceApi')

        api.addRoutes({
            path: '/training',
            methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
            integration:
                new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
                    'TrainingIntegration',
                    invokeTrainingLambda
                ),
        })

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.url!,
            description: 'API Gateway endpoint URL',
        })
    }
}
