import { handler } from './checkStatusTraining'
import { createTestEvent } from '../lib/apiGatewayTestEvent'
import { mockClient } from 'aws-sdk-client-mock'
import {
    SFNClient,
    DescribeExecutionCommand,
    ExecutionDoesNotExist,
} from '@aws-sdk/client-sfn'

const sfnMock = mockClient(SFNClient)

describe('CheckStatusTrainingLambda', () => {
    it('should return a 200 status code and the execution status', async () => {
        const testEvent = createTestEvent('', {}, {}, { executionArn: 'test' })
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

    it('should return a 400 status code if the executionArn is not provided', async () => {
        const testEvent = createTestEvent('', {}, {}, {})
        const response = await handler(testEvent)
        expect(response.statusCode).toEqual(400)
        expect(response.body).toEqual(
            JSON.stringify({
                error: 'executionArn is required and must be provided as a query parameter',
            })
        )
    })

    it('should return a 400 status code if not state machine is found using the executionArn', async () => {
        const testEvent = createTestEvent('', {}, {}, { executionArn: 'test' })
        sfnMock.on(DescribeExecutionCommand).rejects(
            new ExecutionDoesNotExist({
                message:
                    'No state machine found with the provided executionArn',
                $metadata: {
                    httpStatusCode: 400,
                },
            })
        )
        const response = await handler(testEvent)
        expect(response.statusCode).toEqual(400)
        expect(response.body).toEqual(
            JSON.stringify({
                error: 'No state machine found with the provided executionArn',
            })
        )
    })
})
