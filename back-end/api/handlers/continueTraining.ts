import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import {
    SFNClient,
    SendTaskSuccessCommand,
    SendTaskFailureCommand,
} from '@aws-sdk/client-sfn'

const sfn = new SFNClient({})

export async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    try {
        const body = JSON.parse(event.body || '{}')
        const { status, error } = body

        const token = event.queryStringParameters?.taskToken

        if (!token) {
            throw new Error('Task token is required')
        }

        if (status === 'succeeded') {
            await sfn.send(
                new SendTaskSuccessCommand({
                    taskToken: token,
                    output: JSON.stringify({ status: 'succeeded' }),
                })
            )
        } else {
            await sfn.send(
                new SendTaskFailureCommand({
                    taskToken: token,
                    error: 'TrainingFailed',
                    cause: error || 'Unknown error',
                })
            )
        }

        return {
            statusCode: 200,
            body: '',
        }
    } catch (error) {
        console.error('Error processing webhook:', error)
        // Return a 200 error to avoid retrying the webhook
        return {
            statusCode: 201,
            body: '',
        }
    }
}
