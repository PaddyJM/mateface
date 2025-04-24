import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { ZodError } from 'zod'

export function apiErrorHandler(
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) {
    return async (event: APIGatewayProxyEvent) => {
        try {
            return await handler(event)
        } catch (error) {
            console.error(error)
            if (error instanceof ZodError) {
                return {
                    statusCode: 400,
                    body: error.message,
                }
            }
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Internal server error',
                }),
            }
        }
    }
}
