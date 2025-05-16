import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, DescribeExecutionCommand, ExecutionDoesNotExist } from '@aws-sdk/client-sfn';

const sfn = new SFNClient({});

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const executionArn = event.queryStringParameters?.executionArn;
        
        if (!executionArn) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'executionArn is required and must be provided as a query parameter' })
            };
        }

        const command = new DescribeExecutionCommand({
            executionArn
        });

        const response = await sfn.send(command);
        
        const output = response.output ? JSON.parse(response.output) : null;

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: response.status,
                output,
                startDate: response.startDate,
                stopDate: response.stopDate
            })
        };
    } catch (error) {
        console.error('Error getting execution status:', error);

        if (error instanceof ExecutionDoesNotExist) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No state machine found with the provided executionArn' })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get execution status' })
        };
    }
}