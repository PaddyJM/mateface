import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } from '@aws-sdk/client-sfn';

const sfn = new SFNClient({});

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const body = JSON.parse(event.body || '{}');
        const { token, status, error } = body;

        if (status === 'succeeded') {
            await sfn.send(new SendTaskSuccessCommand({
                taskToken: token,
                output: JSON.stringify({ status: 'succeeded' })
            }));
        } else {
            await sfn.send(new SendTaskFailureCommand({
                taskToken: token,
                error: 'TrainingFailed',
                cause: error || 'Unknown error'
            }));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook processed successfully' })
        };
    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error processing webhook' })
        };
    }
}