import { SendTaskSuccessCommand, SFNClient } from '@aws-sdk/client-sfn'
import { mockClient } from 'aws-sdk-client-mock'
import { handler } from './continueTraining'
import { createTestEvent } from '../lib/apiGatewayTestEvent'

const sfnMock = mockClient(SFNClient)
describe('ContinueTrainingLambda', () => {
    it('should invoke the training state machine with a succeeded status if it receives a success webhook', async () => {
        sfnMock.on(SendTaskSuccessCommand).resolves({})
        const testEvent = createTestEvent(
            JSON.stringify({
                status: 'succeeded',
                token: 'test-token',
            })
        )
        await handler(testEvent)
        expect(sfnMock.calls()).toHaveLength(1)
        const mockCall = sfnMock.calls()[0].args[0] as SendTaskSuccessCommand
        expect(mockCall.input.output).toEqual(
            JSON.stringify({ status: 'succeeded' })
        )
    })
})
