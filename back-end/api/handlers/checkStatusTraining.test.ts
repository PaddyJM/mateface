import { handler } from './checkStatusTraining'
import { createTestEvent } from '../lib/apiGatewayTestEvent'
import { mockClient } from 'aws-sdk-client-mock'
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn'

const sfnMock = mockClient(SFNClient)

describe('CheckStatusTrainingLambda', () => {
    it('should return a 200 status code if the execution is successful', async () => {
        const testEvent = createTestEvent('', {}, { executionArn: 'test' })
        const startDate = new Date()
        const stopDate = new Date()
        sfnMock.on(DescribeExecutionCommand).resolves({
            status: 'SUCCEEDED',
            output: JSON.stringify({}),
            startDate,
            stopDate,
        })
        const response = await handler(testEvent)
        expect(response.statusCode).toEqual(200)
        expect(response.body).toEqual(
            JSON.stringify({
                status: 'SUCCEEDED',
                output: {},
                startDate,
                stopDate,
            })
        )
    })
})
