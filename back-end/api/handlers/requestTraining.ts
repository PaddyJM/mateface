import Replicate, { Model } from 'replicate'
import { requestTrainingSchema } from '../lib/schemas'
import { stepfunctionErrorHandler } from '../middleware/stepfunctionErrorHandler'

const TRAINING_MODEL_USERNAME = 'ostris'
const TRAINING_MODEL_NAME = 'flux-dev-lora-trainer'

let replicateClient: Replicate

export class RequestTraining {
    private replicateClient: Replicate
    constructor(replicateClient: Replicate) {
        this.replicateClient = replicateClient
    }

    async requestTraining(input: any) {
        console.log(input)
        const { username, modelName, s3Url, taskToken } =
            requestTrainingSchema.parse(input)

        const replicateAccountName = process.env.REPLICATE_ACCOUNT_NAME!

        let modelToTrain: Model
        try {
            modelToTrain = await this.replicateClient.models.get(
                replicateAccountName,
                `${username}/${modelName}`
            )
        } catch (error) {
            console.log(error)
            modelToTrain = await this.replicateClient.models.create(
                replicateAccountName,
                `${username}/${modelName}`,
                {
                    visibility: 'private',
                    hardware: 'gpu-t4',
                    description: 'A fine-tuned FLUX.1 model',
                }
            )
        }

        console.log('modelToTrain', modelToTrain)

        const trainingModel = await this.replicateClient.models.get(
            TRAINING_MODEL_USERNAME,
            TRAINING_MODEL_NAME
        )

        console.log('trainingModel', trainingModel)

        if (!trainingModel.latest_version) {
            throw new Error('No latest version found for training model')
        }

        const training = await this.replicateClient.trainings.create(
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
}

const createHandler = () => {
    const defaultClient = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
    });
    return new RequestTraining(defaultClient);
};

export const handler = stepfunctionErrorHandler((input: any) => {
    const handler = createHandler();
    return handler.requestTraining(input);
});
