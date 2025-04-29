import { APIGatewayProxyEvent } from 'aws-lambda'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { apiErrorHandler } from '../middleware/apiErrorHandler'
import uploadToS3 from '../lib/uploadToS3'
import { parse } from 'lambda-multipart-parser'
import * as unzipper from 'unzipper'

const sfnClient = new SFNClient({})
const stateMachineArn = process.env.STATE_MACHINE_ARN

export async function invokeTraining(event: APIGatewayProxyEvent) {
    const parsedEvent = await parse(event)

    const username = parsedEvent.username
    const modelName = parsedEvent.modelName

    const files = parsedEvent.files
    const file = files.find((file) => file.fieldname === 'file')
    const fileBuffer = file?.content

    if (!fileBuffer) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'No file found',
            }),
        }
    }

    // Check if file is a ZIP by examining the first few bytes (ZIP magic numbers)
    const isZip =
        fileBuffer[0] === 0x50 &&
        fileBuffer[1] === 0x4b &&
        fileBuffer[2] === 0x03 &&
        fileBuffer[3] === 0x04

    if (!isZip) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid file format. Please upload a ZIP file.',
            }),
        }
    }

    // Validate ZIP contents
    try {
        const directory = await unzipper.Open.buffer(fileBuffer)

        const invalidFiles = directory.files.filter((file) => {
            // Skip directories
            if (file.type === 'Directory') return false

            const ext = file.path.toLowerCase().split('.').pop() || ''
            return !['jpg', 'jpeg', 'png'].includes(ext)
        })

        if (invalidFiles.length > 0) {
            const invalidFileNames = invalidFiles.map((f) => f.path).join(', ')
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: `Invalid file types found. All files must be jpg, jpeg, or png. Invalid files: ${invalidFileNames}`,
                }),
            }
        }
    } catch (error) {
        console.error(error)
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Error reading ZIP file contents',
            }),
        }
    }

    const s3Url = await uploadToS3(fileBuffer, username, modelName)

    const response = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn,
            input: JSON.stringify({
                username,
                modelName,
                s3Url,
            }),
        })
    )

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Training invoked',
            stepFunctionExecutionArn: response.executionArn,
        }),
    }
}

export const handler = apiErrorHandler(invokeTraining)
