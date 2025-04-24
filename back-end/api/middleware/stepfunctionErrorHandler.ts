import { ZodError } from 'zod'

export function stepfunctionErrorHandler(
    handler: (input: any) => Promise<any>
) {
    return async (input: any) => {
        try {
            return await handler(input)
        } catch (error: any) {
            console.error(error)
            if (error instanceof ZodError) {
                throw JSON.stringify({
                    errorType: 'ValidationError',
                    errorMessage: 'Invalid input',
                    details: error.format(),
                })
            }
            throw JSON.stringify({
                errorType: error.name || 'Error',
                errorMessage: error.message || 'An unexpected error occurred',
                details: error,
            })
        }
    }
}
