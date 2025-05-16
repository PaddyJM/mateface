import { SendTaskSuccessCommand, SFNClient } from '@aws-sdk/client-sfn'
import { mockClient } from 'aws-sdk-client-mock'
import { handler } from './continueTraining'
import { createTestEvent } from '../lib/apiGatewayTestEvent'

const sfnMock = mockClient(SFNClient)
describe('ContinueTrainingLambda', () => {
    it('should invoke the correct training state machine with a succeeded status if it receives a success webhook, and return a 200 status code', async () => {
        sfnMock.on(SendTaskSuccessCommand).resolves({})
        const testEvent = createTestEvent(
            JSON.stringify({
                status: 'succeeded',
            }),
            {},
            {
                taskToken: 'test-token',
            }
        )
        const response = await handler(testEvent)
        expect(sfnMock.calls()).toHaveLength(1)
        const mockCall = sfnMock.calls()[0].args[0] as SendTaskSuccessCommand
        expect(mockCall.input.output).toEqual(
            JSON.stringify({ status: 'succeeded' })
        )
        expect(mockCall.input.taskToken).toEqual('test-token')
        expect(response.statusCode).toEqual(200)
    })

    it('should throw an error if the task token is not provided, and return a 200 to avoid retrying the webhook', async () => {
        const consoleSpy = jest.spyOn(console, 'error')
        const testEvent = createTestEvent(
            JSON.stringify({ status: 'succeeded' }),
            {},
            {}
        )
        const response = await handler(testEvent)

        expect(response.statusCode).toEqual(201)
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error processing webhook:',
            new Error('Task token is required')
        )
    })
})
