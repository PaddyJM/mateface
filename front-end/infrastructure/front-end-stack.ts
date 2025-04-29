import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const bucket = new cdk.aws_s3.Bucket(this, 'MatefaceWebsiteBucket', {
            publicReadAccess: false,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            accessControl: cdk.aws_s3.BucketAccessControl.PRIVATE,
            objectOwnership: cdk.aws_s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
        })

        const cloudfrontOriginAccessIdentity =
            new cdk.aws_cloudfront.OriginAccessIdentity(
                this,
                'CloudFrontOriginAccessIdentity'
            )

        bucket.addToResourcePolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ['s3:GetObject'],
                resources: [bucket.arnForObjects('*')],
                principals: [
                    new cdk.aws_iam.CanonicalUserPrincipal(
                        cloudfrontOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
                    ),
                ],
            })
        )

        const responseHeaderPolicy =
            new cdk.aws_cloudfront.ResponseHeadersPolicy(
                this,
                'SecurityHeadersResponseHeaderPolicy',
                {
                    comment: 'Security headers response header policy',
                    corsBehavior: {
                        accessControlAllowOrigins: ['*'],
                        accessControlAllowMethods: [
                            'GET',
                            'PUT',
                            'POST',
                            'DELETE',
                        ],
                        accessControlAllowHeaders: ['*'],
                        accessControlAllowCredentials: false,
                        originOverride: true,
                    },
                    securityHeadersBehavior: {
                        strictTransportSecurity: {
                            override: true,
                            accessControlMaxAge: cdk.Duration.days(2 * 365),
                            includeSubdomains: true,
                            preload: true,
                        },
                        contentTypeOptions: {
                            override: true,
                        },
                        referrerPolicy: {
                            override: true,
                            referrerPolicy:
                                cdk.aws_cloudfront.HeadersReferrerPolicy
                                    .STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                        },
                        xssProtection: {
                            override: true,
                            protection: true,
                            modeBlock: true,
                        },
                        frameOptions: {
                            override: true,
                            frameOption:
                                cdk.aws_cloudfront.HeadersFrameOption.DENY,
                        },
                    },
                }
            )

        new cdk.aws_s3_deployment.BucketDeployment(this, 'MatefaceWebsite', {
            sources: [cdk.aws_s3_deployment.Source.asset('../build')],
            destinationBucket: bucket,
        })

        const cloudfrontDistribution = new cdk.aws_cloudfront.Distribution(
            this,
            'CloudFrontDistribution',
            {
                defaultRootObject: 'index.html',
                defaultBehavior: {
                    origin: new cdk.aws_cloudfront_origins.S3Origin(bucket, {
                        originAccessIdentity: cloudfrontOriginAccessIdentity,
                    }),
                    viewerProtocolPolicy:
                        cdk.aws_cloudfront.ViewerProtocolPolicy
                            .REDIRECT_TO_HTTPS,
                    responseHeadersPolicy: responseHeaderPolicy,
                },
            }
        )
    }
}
