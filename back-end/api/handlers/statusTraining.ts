import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const sfn = new SFNClient({});

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    try {
        const executionArn = event.queryStringParameters?.executionArn;
        
        if (!executionArn) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'executionArn is required' })
            };
        }

        const command = new DescribeExecutionCommand({
            executionArn
        });

        const response = await sfn.send(command);
        
        // The output will contain any data passed to Succeed state
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
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get execution status' })
        };
    }
}