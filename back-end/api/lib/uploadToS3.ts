import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
    region: 'eu-west-2',
})

export default async function uploadToS3(
    zip: Buffer,
    username: string,
    modelName: string
) {
    const objectKey = `${username}/${modelName}/${Date.now()}/training_data.zip`

    await s3Client.send(
        new PutObjectCommand({
            Bucket: process.env.TRAINING_BUCKET_NAME,
            Key: objectKey,
            Body: zip,
        })
    )

    const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.TRAINING_BUCKET_NAME,
        Key: objectKey,
    })

    const s3Url = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 60 * 60 * 24,
    })

    return s3Url
}
