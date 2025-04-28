import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import uploadToS3 from "./uploadToS3";
import * as fs from "fs";
import * as path from "path";

// Mock the S3 client
const s3Mock = mockClient(S3Client);

// Mock the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn()
}));

describe('UploadToS3', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        s3Mock.reset();
        (getSignedUrl as jest.Mock).mockReset();
    });

    it('should send the zip to S3 and return a signed url', async () => {
        // Setup mocks
        s3Mock.on(PutObjectCommand).resolves({});
        (getSignedUrl as jest.Mock).mockResolvedValue('https://mocked-signed-url.com');

        // Test data
        const zip = fs.readFileSync(path.join(__dirname, '../test/valid-test.zip'));
        
        // Execute
        const s3Url = await uploadToS3(zip, 'testUser', 'testModel');

        // Assertions
        expect(s3Url).toBe('https://mocked-signed-url.com');
        
        // Verify S3 client was called correctly
        expect(s3Mock.calls()).toHaveLength(1);
        const putObjectCall = s3Mock.call(0);
        expect(putObjectCall.args[0].input).toEqual({
            Bucket: process.env.TRAINING_BUCKET_NAME,
            Key: expect.stringContaining('testUser/testModel/'),
            Body: zip,
        });

        // Verify getSignedUrl was called correctly
        expect(getSignedUrl).toHaveBeenCalledWith(
            expect.any(S3Client),
            expect.any(GetObjectCommand),
            { expiresIn: 60 * 60 * 24 }
        );
    });

    it('should throw an error if S3 upload fails', async () => {
        // Setup mock to simulate failure
        s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

        // Test data
        const zip = fs.readFileSync(path.join(__dirname, '../test/valid-test.zip'));
        
        // Execute and assert
        await expect(uploadToS3(zip, 'testUser', 'testModel'))
            .rejects
            .toThrow('Upload failed');
    });
});