import { requestTraining } from './requestTraining'
import { Model, Prediction } from 'replicate'

jest.mock('replicate', () => {
    return {
        default: class {
            constructor() {
                return {
                    models: {
                        get: jest
                            .fn()
                            .mockResolvedValueOnce({})
                            .mockResolvedValueOnce({
                                latest_version: {
                                    id: 'test',
                                },
                            }),
                        create: jest.fn(),
                    },
                    trainings: {
                        create: jest.fn().mockResolvedValueOnce({
                            id: 'test',
                        }),
                    },
                }
            }
        },
    }
})

describe('requestTraining', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })
    it('should request training from the replicate API when there is an existing model', async () => {
        const testEvent = {
            username: 'test',
            modelName: 'test',
            s3Url: 'test',
            taskToken: 'test',
        }
        const mockModel: Model = {
            url: 'test',
            owner: 'test',
            name: 'test',
            visibility: 'private',
            run_count: 0,
        }
        const mockTrainingModel: Model = {
            url: 'test',
            owner: 'test',
            name: 'test',
            visibility: 'private',
            run_count: 0,
        }
        // mockModelGet.mockResolvedValueOnce(mockTrainingModel)
        const mockTraining: Prediction = {
            id: 'test',
            version: 'test',
            input: {},
            output: {},
            model: 'test',
            created_at: 'test',
            source: 'api',
            status: 'succeeded',
            urls: {
                get: 'test',
                cancel: 'test',
            },
        }
        // mockTrainingCreate.mockResolvedValueOnce(mockTraining)
        const response = await requestTraining(testEvent)
        expect(response).toEqual({
            trainingId: 'test',
        })
    })
})
