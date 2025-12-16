import { argv } from 'node:process'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import path from 'node:path'

const localstackEndpoint = 'http://localhost:4566'
const ingestEndpoint = 'http://localhost:3001/cdp-uploader-callback'
const validResourceTypes = [
    'parcels',
    'moorland',
    'covers',
    'agreements',
    'compatibility-matrix'
]

async function callCallbackEndpoint(filename, s3Path) {
    const response = await fetch(ingestEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uploadStatus: 'ready',
            metadata: {
                customerId: '1234',
                accountId: '1234'
            },
            form: {
                file: {
                    fileId: crypto.randomUUID(),
                    filename: filename,
                    contentType: 'text/csv',
                    fileStatus: 'complete',
                    contentLength: 230084,
                    checksumSha256: 'sMzb2c3cUfnYlkpsMF5xz9JFKv+wz4h5Yo3NQVH0CEQ=',
                    s3Key: s3Path,
                    s3Bucket: 'land-data'
                }
            },
            numberOfRejectedFiles: 0
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to call callback endpoint: ${response.statusText}`)
    }

    return response.json()
}

async function uploadFileToS3(filepath, resourceType, ingestId) {
    const s3Client = new S3Client({
        region: 'eu-west-2',
        endpoint: localstackEndpoint,
        forcePathStyle: true,
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test'
        }
    })

    const content = fs.readFileSync(filepath, 'utf8')
    const filename = path.basename(filepath)
    const s3Path = path.join(resourceType, ingestId, filename)
    const command = new PutObjectCommand({
        Bucket: 'land-data',
        Key: s3Path,
        Body: content,
        ContentType: 'text/csv'
    })

    await s3Client.send(command)
    return s3Path
}

async function ingestFile(filepath, resourceType) {
    try {
        const ingestId = crypto.randomUUID()
        const filename = path.basename(filepath)
        const s3Path = await uploadFileToS3(filepath, resourceType, ingestId)
        console.log(`Uploaded file to S3: ${s3Path} with ingest id: ${ingestId}`)
        await callCallbackEndpoint(filename, s3Path)
        console.log(`Called callback endpoint for file: ${filename}`)
    } catch (error) {
        console.error(`Error ingesting file: ${error}`)
    }
}

async function startIngest(filepath, resourceType) {
    const isDirectory = fs.lstatSync(filepath).isDirectory()
    if (isDirectory) {
        const files = fs.readdirSync(filepath)
        files.forEach(file => {
            if (file.endsWith('.csv')) {
                ingestFile(path.join(filepath, file), resourceType)
            }
        })
    } else {
        ingestFile(filepath, resourceType)
    }
}



const [resourceType, filepath] = argv.slice(2)
console.log(`Ingesting file: ${filepath} for resource type: ${resourceType}`)
if (validResourceTypes.includes(resourceType) && filepath) {
    startIngest(filepath, resourceType)
} else {
    console.error(
        `Invalid resource type: ${resourceType} or file path: ${filepath}`
    )
    process.exit(1)
}
