import { z } from 'zod'

export const requestTrainingSchema = z.object({
    username: z.string(),
    modelName: z.string(),
    s3Url: z.string(),
    taskToken: z.string(),
})
