import { ZodError } from 'zod'
import { createTestEvent } from '../lib/apiGatewayTestEvent'
import { apiErrorHandler } from './apiErrorHandler'

describe('apiErrorHandler', () => {
    let consoleSpy: jest.SpyInstance
    beforeEach(() => {
        // Setup console spy before each test
        consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
        // Restore console spy after each test
        consoleSpy.mockRestore()
    })
    it('should log the error and return a 500 status code if the handler throws an error', async () => {
        const handler = apiErrorHandler(() => {
            throw new Error('test')
        })

        const event = createTestEvent('dummy content')
        const response = await handler(event)

        expect(response.statusCode).toEqual(500)
        expect(consoleSpy).toHaveBeenCalledWith(new Error('test'))
    })

    it('should log the error and return a 400 code if the handle throws a ZodError', async () => {
        const handler = apiErrorHandler(() => {
            throw new ZodError([{ message: 'test', path: ['test'], code: 'custom' }])
        })

        const event = createTestEvent('dummy content')
        const response = await handler(event)

        expect(response.statusCode).toEqual(400)
        expect(consoleSpy).toHaveBeenCalledWith(new ZodError([{ message: 'test', path: ['test'], code: 'custom' }]))
    })
})
