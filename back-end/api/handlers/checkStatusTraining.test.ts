import { handler } from "./checkStatusTraining"

import { createTestEvent } from "../lib/apiGatewayTestEvent"

describe('CheckStatusTrainingLambda', () => {
    it('should return a 200 status code if the execution is successful', async () => {
        const testEvent = createTestEvent(JSON.stringify({ status: 'succeeded' }), {}, {})
        const response = await handler(testEvent)
        expect(response.statusCode).toEqual(200)
    })
})