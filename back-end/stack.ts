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

        const trainingDataBucket = new cdk.aws_s3.Bucket(this, 'MatefaceTrainingDataBucket', {
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

        const continueTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            'ContinueTrainingLambda',
            {
                entry: path.join(
                    __dirname,
                    './api/handlers/continueTraining.ts'
                ),
                handler: 'handler',
                runtime,
                environment: {
                    TRAINING_BUCKET_NAME: process.env.TRAINING_BUCKET_NAME!,
                },
            }
        )

        const waitForWebhookState =
            new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                this,
                'WaitForWebhookState',
                {
                    lambdaFunction: continueTrainingLambda,
                    integrationPattern:
                        cdk.aws_stepfunctions.IntegrationPattern
                            .WAIT_FOR_TASK_TOKEN,
                    payload: cdk.aws_stepfunctions.TaskInput.fromObject({
                        token: cdk.aws_stepfunctions.JsonPath.taskToken,
                        input: cdk.aws_stepfunctions.JsonPath.stringAt('$'),
                    }),
                }
            )

        const successState = new cdk.aws_stepfunctions.Succeed(
            this,
            'SuccessState'
        )
        const failState = new cdk.aws_stepfunctions.Fail(this, 'FailState', {
            cause: 'Training Failed',
            error: 'TrainingError',
        })

        const trainingStateMachine = new cdk.aws_stepfunctions.StateMachine(
            this,
            'TrainingStateMachine',
            {
                definition: requestTrainingLambdaDefinition
                    .next(waitForWebhookState)
                    .next(
                        new cdk.aws_stepfunctions.Choice(
                            this,
                            'CheckWebhookStatus'
                        )
                            .when(
                                cdk.aws_stepfunctions.Condition.stringEquals(
                                    '$.status',
                                    'succeeded'
                                ),
                                successState
                            )
                            .otherwise(failState)
                    ),
                stateMachineName: 'TrainingStateMachine',
            }
        )

        continueTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
                resources: [trainingStateMachine.stateMachineArn],
            })
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
                resources: [trainingDataBucket.bucketArn, `${trainingDataBucket.bucketArn}/*`],
            })
        )

        invokeTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['states:StartExecution'],
                resources: [trainingStateMachine.stateMachineArn],
            })
        )

        const statusTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            'StatusTrainingLambda',
            {
                entry: path.join(__dirname, './api/handlers/statusTraining.ts'),
                handler: 'handler',
                runtime,
            }
        )

        statusTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['states:DescribeExecution'],
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

        api.addRoutes({
            path: '/training/continue',
            methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
            integration:
                new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
                    'TrainingWebhookIntegration',
                    continueTrainingLambda
                ),
        })

        api.addRoutes({
            path: '/training/{executionArn}/status',
            methods: [cdk.aws_apigatewayv2.HttpMethod.GET],
            integration:
                new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
                    'TrainingStatusIntegration',
                    statusTrainingLambda
                ),
        })

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.url!,
            description: 'API Gateway endpoint URL',
        })
    }
}
