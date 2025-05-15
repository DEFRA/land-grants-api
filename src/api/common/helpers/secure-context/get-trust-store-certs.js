/**
 * Gets base64 encoded certificates from environment variables based on a prefix
 * @param {NodeJS.ProcessEnv} envs - Environment variables
 * @param {string} prefix - The prefix to filter environment variables (default: 'TRUSTSTORE_')
 * @returns {string[]} Array of decoded certificates
 */
function getCertificatesFromEnv(envs, prefix = 'TRUSTSTORE_') {
  return Object.entries(envs)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value)
    .filter(Boolean)
    .map((envValue) => Buffer.from(envValue, 'base64').toString().trim())
}

/**
 * Get all trust store certificates
 * @param {NodeJS.ProcessEnv} envs
 * @returns {string[]}
 */
function getTrustStoreCerts(envs) {
  return getCertificatesFromEnv(envs, 'TRUSTSTORE_')
}

/**
 * Get RDS certificates specifically
 * @param {NodeJS.ProcessEnv} envs
 * @returns {string[]}
 */
function getRdsCertificates(envs) {
  return getCertificatesFromEnv(envs, 'TRUSTSTORE_RDS')
}

export { getCertificatesFromEnv, getRdsCertificates, getTrustStoreCerts }
