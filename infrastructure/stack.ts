import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const trainingBucketName = process.env.TRAINING_BUCKET_NAME

export class MatefaceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const bucket = new cdk.aws_s3.Bucket(this, 'MatefaceModelsBucket', {
            bucketName: trainingBucketName,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })
    }
}
