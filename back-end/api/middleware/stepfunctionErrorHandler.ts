import { ZodError } from 'zod'

export function stepfunctionErrorHandler(
    handler: (input: any) => Promise<any>
) {
    return async (input: any) => {
        try {
            return await handler(input)
        } catch (error: any) {
            if (error instanceof ZodError) {
                const formattedError = new Error(JSON.stringify(error.format()))
                formattedError.name = 'ValidationError'
                throw formattedError
            }
            throw error
        }
    }
}
