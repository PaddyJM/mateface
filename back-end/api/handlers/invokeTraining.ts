import { APIGatewayProxyEvent } from 'aws-lambda'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { apiErrorHandler } from '../middleware/apiErrorHandler'
import uploadToS3 from '../lib/uploadToS3'
import { parse } from 'lambda-multipart-parser'
const sfnClient = new SFNClient({})
const stateMachineArn = process.env.STATE_MACHINE_ARN

export async function invokeTraining(event: APIGatewayProxyEvent) {
    console.log(event)
    const parsedEvent = await parse(event)
    
    console.log(parsedEvent)
    
    const username = parsedEvent.username
    const modelName = parsedEvent.modelName

    const files = parsedEvent.files
    const file = files.find((file) => file.fieldname === 'file')
    const fileBuffer = file?.content
    if (!fileBuffer) {
        throw new Error('No file found')
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
