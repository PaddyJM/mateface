import { invokeTraining } from './invokeTraining'
import { createTestEvent } from '../lib/apiGatewayTestEvent'
import { mockClient } from 'aws-sdk-client-mock'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'

jest.mock('lambda-multipart-parser', () => ({
    parse: jest.fn().mockResolvedValue({
        username: 'test',
        modelName: 'test',
        files: [{
            fieldname: 'file',
            content: Buffer.from('test file content')
        }]
    })
}))

jest.mock('../lib/uploadToS3', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue('mocked-s3-url')
}))

const sfnMock = mockClient(SFNClient)

describe('InvokeTrainingLambda', () => {
    beforeEach(() => {
        sfnMock.reset()
    })

    it('should invoke the training state machine', async () => {
        sfnMock.on(StartExecutionCommand).resolves({
            executionArn: 'test',
        })

        const testEvent = createTestEvent('dummy content', {
            'Content-Type': 'multipart/form-data',
        })

        expect(await invokeTraining(testEvent)).toEqual({
            statusCode: 200,
            body: JSON.stringify({
                message: 'Training invoked',
                stepFunctionExecutionArn: 'test',
            }),
        })
    })
})
