import Replicate, { Model } from 'replicate'
import { requestTrainingSchema } from '../lib/schemas'
import { stepfunctionErrorHandler } from '../middleware/stepfunctionErrorHandler'

const replicateClient = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
})

const TRAINING_MODEL_USERNAME = 'ostris'
const TRAINING_MODEL_NAME = 'flux-dev-lora-trainer'

export async function requestTraining(input: any) {
    console.log(input)
    const { username, modelName, s3Url, taskToken } = requestTrainingSchema.parse(input)

    let modelToTrain: Model
    try {
        modelToTrain = await replicateClient.models.get(username, modelName)
    } catch (error) {
        console.log(error)
        modelToTrain = await replicateClient.models.create(
            username,
            modelName,
            {
                visibility: 'private',
                hardware: 'gpu-t4',
                description: 'A fine-tuned FLUX.1 model',
            }
        )
    }

    console.log('modelToTrain', modelToTrain)

    const trainingModel = await replicateClient.models.get(
        TRAINING_MODEL_USERNAME,
        TRAINING_MODEL_NAME
    )

    console.log('trainingModel', trainingModel)

    if (!trainingModel.latest_version) {
        throw new Error('No latest version found for training model')
    }

    const training = await replicateClient.trainings.create(
        TRAINING_MODEL_USERNAME,
        TRAINING_MODEL_NAME,
        trainingModel.latest_version.id,
        {
            destination: `${username}/${modelName}`,
            input: {
                input_images: s3Url,
                hf_token: process.env.HF_API_TOKEN,
                hf_repo_id: process.env.HF_REPO_ID,
            },
            webhook: `${process.env.API_URL}/training/continue?taskToken=${encodeURIComponent(taskToken)}`,
            webhook_events_filter: ['completed'],
        }
    )

    console.log('training', training)

    return {
        trainingId: training.id,
    }
}

export const handler = stepfunctionErrorHandler(requestTraining)
