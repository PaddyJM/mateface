import { invokeTraining } from './invokeTraining'
import { createTestEvent } from '../lib/apiGatewayTestEvent'
import { mockClient } from 'aws-sdk-client-mock'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import * as fs from 'fs'
import * as path from 'path'

jest.mock('lambda-multipart-parser', () => ({
    parse: jest.fn(),
}))

jest.mock('../lib/uploadToS3', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue('mocked-s3-url'),
}))

const sfnMock = mockClient(SFNClient)

describe('InvokeTrainingLambda', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('should invoke the training state machine', async () => {
        const mockZipBuffer = fs.readFileSync(
            path.join(__dirname, '../test/valid-test.zip')
        )
        require('lambda-multipart-parser').parse.mockResolvedValue({
            username: 'test',
            modelName: 'test',
            files: [
                {
                    fieldname: 'file',
                    filename: 'test.zip',
                    content: mockZipBuffer,
                    contentType: 'application/zip',
                },
            ],
        })

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

    it('should return a 400 status code if no file is found', async () => {
        require('lambda-multipart-parser').parse.mockResolvedValue({
            username: 'test',
            modelName: 'test',
            files: [],
        })

        const testEvent = createTestEvent('dummy content', {
            'Content-Type': 'multipart/form-data',
        })

        expect(await invokeTraining(testEvent)).toEqual({
            statusCode: 400,
            body: JSON.stringify({ message: 'No file found' }),
        })
    })

    it('should return a 400 status code if the file is not a zip file', async () => {
        require('lambda-multipart-parser').parse.mockResolvedValue({
            username: 'test',
            modelName: 'test',
            files: [
                {
                    fieldname: 'file',
                    filename: 'test.txt',
                    content: Buffer.from('test file content'),
                    contentType: 'text/plain',
                },
            ],
        })
        const testEvent = createTestEvent('dummy content', {
            'Content-Type': 'multipart/form-data',
        })

        expect(await invokeTraining(testEvent)).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid file format. Please upload a ZIP file.',
            }),
        })
    })

    it('should return a 400 status code if the files in the zip are not jpg, jpeg or png', async () => {
        const mockZipBuffer = fs.readFileSync(
            path.join(__dirname, '../test/invalid-test.zip')
        )
        require('lambda-multipart-parser').parse.mockResolvedValue({
            username: 'test',
            modelName: 'test',
            files: [
                {
                    fieldname: 'file',
                    filename: 'test.zip',
                    content: mockZipBuffer,
                    contentType: 'application/zip',
                },
            ],
        })
        const testEvent = createTestEvent('dummy content', {
            'Content-Type': 'multipart/form-data',
        })

        expect(await invokeTraining(testEvent)).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                message:
                    'Invalid file types found. All files must be jpg, jpeg, or png. Invalid files: test.txt, __MACOSX/._test.txt',
            }),
        })
    })

    it('should return a 400 status code if the username or model name is invalid', async () => {
        const testEvent = createTestEvent('dummy content', {
            'Content-Type': 'multipart/form-data',
        })
        require('lambda-multipart-parser').parse.mockResolvedValue({
            username: 'test.',
            modelName: 'test.',
            files: [],
        })

        const response = await invokeTraining(testEvent)
        expect(response.statusCode).toBe(400)
        expect(JSON.parse(response.body)).toEqual([
            {
                validation: 'regex',
                code: 'invalid_string',
                message:
                    'Username must contain only lowercase letters, numbers, dots, or underscores, and cannot start or end with dots or underscores',
                path: ['username'],
            },
            {
                validation: 'regex',
                code: 'invalid_string',
                message:
                    'Model name must contain only lowercase letters, numbers, dots, or underscores, and cannot start or end with dots or underscores',
                path: ['modelName'],
            },
        ])
    })
})
