import { APIGatewayProxyEvent } from 'aws-lambda'

export const createTestEvent = (
    body: string,
    headers?: Record<string, string>,
    queryStringParameters?: Record<string, string>
): APIGatewayProxyEvent => ({
    body,
    headers: headers || {
        'Content-Type': 'application/json',
    },
    queryStringParameters: queryStringParameters || {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/invoke-training',
    pathParameters: {},
    resource: '/invoke-training',
    requestContext: {
        authorizer: {
            jwt: {
                claims: {
                    sub: 'test',
                },
            },
        },
        path: 'test',
        stage: 'test',
        requestId: 'test',
        requestTimeEpoch: 1,
        resourceId: 'test',
        resourcePath: 'test',
        accountId: 'test',
        apiId: 'test',
        protocol: 'https',
        httpMethod: 'POST',
        identity: {
            accessKey: 'test',
            accountId: 'test',
            apiKey: 'test',
            apiKeyId: 'test',
            caller: 'test',
            clientCert: {
                clientCertPem: 'test',
                issuerDN: 'test',
                serialNumber: 'test',
                subjectDN: 'test',
                validity: {
                    notAfter: 'test',
                    notBefore: 'test',
                },
            },
            cognitoAuthenticationProvider: 'test',
            cognitoAuthenticationType: 'test',
            cognitoIdentityId: 'test',
            cognitoIdentityPoolId: 'test',
            principalOrgId: 'test',
            sourceIp: 'test',
            user: 'test',
            userAgent: 'test',
            userArn: 'test',
        },
    },
    stageVariables: {},
    multiValueQueryStringParameters: {},
})
