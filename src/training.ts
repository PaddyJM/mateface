import dotenv from 'dotenv'
import fs from 'fs'
import Replicate, { Model } from 'replicate'
import ZipStream from 'zip-stream'
import {
    S3Client,
    PutObjectCommand,
    S3ClientConfig,
    GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
dotenv.config()

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
})

const s3ClientConfig: S3ClientConfig = {
    region: 'eu-west-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
}
const s3Client = new S3Client(s3ClientConfig)

const TRAINING_MODEL_USERNAME = 'ostris'
const TRAINING_MODEL_NAME = 'flux-dev-lora-trainer'

export default async function train(username: string, modelName: string) {
    const files = fs.readdirSync('input')

    const zip = await zipFiles(files)

    const zipKey = `${username}/${modelName}/${Date.now()}/training_data.zip`

    const s3Response = await s3Client.send(
        new PutObjectCommand({
            Bucket: process.env.TRAINING_BUCKET_NAME,
            Key: zipKey,
            Body: zip,
        })
    )

    console.log(s3Response)

    const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.TRAINING_BUCKET_NAME,
        Key: zipKey,
    })

    const s3Url = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 60 * 60 * 24,
    })

    console.log(s3Url)

    let modelToTrain: Model
    try {
        modelToTrain = await replicate.models.get(username, modelName)
    } catch (error) {
        console.log(error)
        modelToTrain = await replicate.models.create(username, modelName, {
            visibility: 'private',
            hardware: 'gpu-t4',
            description: 'A fine-tuned FLUX.1 model',
        })
    }

    console.log(modelToTrain)

    const trainingModel = await replicate.models.get(
        TRAINING_MODEL_USERNAME,
        TRAINING_MODEL_NAME
    )

    console.log(trainingModel)

    if (!trainingModel.latest_version) {
        throw new Error('No latest version found for training model')
    }

    const training = await replicate.trainings.create(
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
        }
    )

    console.log(training)
}

async function zipFiles(files: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        const zip = new ZipStream()

        zip.on('data', (chunk) => chunks.push(chunk))
        zip.on('end', () => resolve(Buffer.concat(chunks)))
        zip.on('error', reject)

        const addFiles = async () => {
            for (const file of files) {
                await new Promise((res, rej) => {
                    zip.entry(
                        fs.readFileSync(`input/${file}`),
                        { name: file },
                        (err) => {
                            if (err) rej(err)
                            else res(null)
                        }
                    )
                })
            }
            zip.finalize()
        }

        addFiles().catch(reject)
    })
}

train('paddyjm', 'mateface_test2')
