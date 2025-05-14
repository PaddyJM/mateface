import { Model, Prediction } from 'replicate'
import { RequestTraining } from './requestTraining'

describe('requestTraining', () => {
    let mockReplicateClient: any
    beforeEach(() => {
        mockReplicateClient = {
            models: {
                get: jest.fn(),
                create: jest.fn(),
            },
            trainings: {
                create: jest.fn(),
            },
        }
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
            latest_version: {
                id: 'test',
                created_at: 'test',
                cog_version: 'test',
                openapi_schema: {},
            },
        }
        mockReplicateClient.models.get
            .mockResolvedValueOnce(mockModel)
            .mockResolvedValueOnce(mockTrainingModel)
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
        mockReplicateClient.trainings.create.mockResolvedValueOnce(mockTraining)
        const handler = new RequestTraining(mockReplicateClient)
        const response = await handler.requestTraining(testEvent)
        expect(response).toEqual({
            trainingId: 'test',
        })
    })

    it('should request training from the replicate API when there is no existing model', async () => {
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
        mockReplicateClient.models.get.mockRejectedValueOnce(
            new Error('Model not found')
        )
        mockReplicateClient.models.create.mockResolvedValueOnce(mockModel)
        const mockTrainingModel: Model = {
            url: 'test',
            owner: 'test',
            name: 'test',
            visibility: 'private',
            run_count: 0,
            latest_version: {
                id: 'test',
                created_at: 'test',
                cog_version: 'test',
                openapi_schema: {},
            },
        }
        mockReplicateClient.models.get.mockResolvedValueOnce(
            mockTrainingModel
        )
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
        mockReplicateClient.trainings.create.mockResolvedValueOnce(mockTraining)
        const handler = new RequestTraining(mockReplicateClient)
        const response = await handler.requestTraining(testEvent)
        expect(response).toEqual({
            trainingId: 'test',
        })
    })
})
