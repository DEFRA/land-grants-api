/**
 * @typedef {object} CDPUploaderRequest
 * @property {string} uploadStatus
 * @property {number} numberOfRejectedFiles
 * @property {object} metadata
 * @property {string} metadata.customerId
 * @property {string} metadata.accountId
 * @property {object} form
 * @property {object} form.file
 * @property {string} form.file.fileId
 * @property {string} form.file.filename
 * @property {string} form.file.contentType
 * @property {string} form.file.fileStatus
 * @property {number} form.file.contentLength
 * @property {string} form.file.checksumSha256
 * @property {string} form.file.s3Key
 * @property {string} form.file.s3Bucket
 */
