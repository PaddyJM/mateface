import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const trainingBucketName = process.env.TRAINING_BUCKET_NAME
const runtime = cdk.aws_lambda.Runtime.NODEJS_20_X
// const architecture = cdk.aws_lambda.Architecture.ARM_64
const idPrefix = 'Mateface'

export class MatefaceBackEndStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const trainingDataBucket = new cdk.aws_s3.Bucket(
            this,
            `${idPrefix}TrainingDataBucket`,
            {
                bucketName: trainingBucketName,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            }
        )

        const api = new cdk.aws_apigatewayv2.HttpApi(this, `${idPrefix}Api`)

        const requestTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            `${idPrefix}RequestTrainingLambda`,
            {
                entry: path.join(
                    __dirname,
                    './api/handlers/requestTraining.ts'
                ),
                handler: 'handler',
                runtime,
                environment: {
                    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN!,
                    API_URL: api.url!,
                    REPLICATE_ACCOUNT_NAME: process.env.REPLICATE_ACCOUNT_NAME!,
                },
                // architecture,
                timeout: cdk.Duration.seconds(300),
            }
        )

        const requestTrainingLambdaDefinition =
            new cdk.aws_stepfunctions_tasks.LambdaInvoke(
                this,
                `${idPrefix}RequestTrainingLambdaDefinition`,
                {
                    lambdaFunction: requestTrainingLambda,
                    integrationPattern:
                        cdk.aws_stepfunctions.IntegrationPattern
                            .WAIT_FOR_TASK_TOKEN,
                    payload: cdk.aws_stepfunctions.TaskInput.fromObject({
                        username:
                            cdk.aws_stepfunctions.JsonPath.stringAt(
                                '$.username'
                            ),
                        modelName:
                            cdk.aws_stepfunctions.JsonPath.stringAt(
                                '$.modelName'
                            ),
                        s3Url: cdk.aws_stepfunctions.JsonPath.stringAt(
                            '$.s3Url'
                        ),
                        taskToken: cdk.aws_stepfunctions.JsonPath.taskToken,
                    }),
                }
            )

        const continueTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            `${idPrefix}ContinueTrainingLambda`,
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

        const trainingSuccessState = new cdk.aws_stepfunctions.Succeed(
            this,
            `${idPrefix}TrainingSuccessState`
        )
        const trainingFailState = new cdk.aws_stepfunctions.Fail(
            this,
            `${idPrefix}TrainingFailState`,
            {
                cause: 'Training Failed',
                error: 'TrainingError',
            }
        )

        const trainingStateMachine = new cdk.aws_stepfunctions.StateMachine(
            this,
            `${idPrefix}TrainingStateMachine`,
            {
                definition: requestTrainingLambdaDefinition.next(
                    new cdk.aws_stepfunctions.Choice(this, 'CheckTrainingWebhookStatus')
                        .when(
                            cdk.aws_stepfunctions.Condition.stringEquals(
                                '$.status',
                                'succeeded'
                            ),
                            trainingSuccessState
                        )
                        .otherwise(trainingFailState)
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
            `${idPrefix}InvokeTrainingLambda`,
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
                resources: [
                    trainingDataBucket.bucketArn,
                    `${trainingDataBucket.bucketArn}/*`,
                ],
            })
        )

        invokeTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['states:StartExecution'],
                resources: [trainingStateMachine.stateMachineArn],
            })
        )

        const checkStatusTrainingLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
            this,
            `${idPrefix}CheckStatusTrainingLambda`,
            {
                entry: path.join(__dirname, './api/handlers/checkStatusTraining.ts'),
                handler: 'handler',
                runtime,
            }
        )

        checkStatusTrainingLambda.addToRolePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['states:DescribeExecution'],
                resources: [trainingStateMachine.stateMachineArn],
            })
        )

        api.addRoutes({
            path: '/training',
            methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
            integration:
                new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
                    `${idPrefix}TrainingIntegration`,
                    invokeTrainingLambda
                ),
        })

        api.addRoutes({
            path: '/training/continue',
            methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
            integration:
                new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
                    `${idPrefix}TrainingWebhookIntegration`,
                    continueTrainingLambda
                ),
        })

        api.addRoutes({
            path: '/training/{executionArn}/status',
            methods: [cdk.aws_apigatewayv2.HttpMethod.GET],
            integration:
                new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration(
                    `${idPrefix}TrainingStatusIntegration`,
                    checkStatusTrainingLambda
                ),
        })

        new cdk.CfnOutput(this, `${idPrefix}ApiEndpoint`, {
            value: api.url!,
            description: 'API Gateway endpoint URL',
        })
    }
}
