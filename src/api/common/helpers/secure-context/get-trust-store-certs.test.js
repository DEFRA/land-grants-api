import {
  getCertificatesFromEnv,
  getRdsCertificates,
  getTrustStoreCerts
} from '~/src/api/common/helpers/secure-context/get-trust-store-certs.js'

describe('#getCertificatesFromEnv', () => {
  const mockProcessEnvWithCerts = {
    TRUSTSTORE_CA_ONE:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1kb3JpcwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
    TRUSTSTORE_RDS_ROOT_CA:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1yZHMtY2EKZm9vYmFyCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
    CUSTOM_PREFIX_CERT:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCmN1c3RvbS1jZXJ0CmJhegotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
    UNRELATED_ENV: 'not-a-cert'
  }

  test('Should get certificates with custom prefix', () => {
    expect(
      getCertificatesFromEnv(mockProcessEnvWithCerts, 'CUSTOM_PREFIX_')
    ).toEqual([
      '-----BEGIN CERTIFICATE-----\ncustom-cert\nbaz\n-----END CERTIFICATE-----'
    ])
  })

  test('Should return empty array when no matching prefix', () => {
    expect(
      getCertificatesFromEnv(mockProcessEnvWithCerts, 'NONEXISTENT_')
    ).toEqual([])
  })

  test('Should handle empty env object', () => {
    expect(getCertificatesFromEnv({}, 'CUSTOM_PREFIX_')).toEqual([])
  })
})

describe('#getTrustStoreCerts', () => {
  const mockProcessEnvWithCerts = {
    TRUSTSTORE_CA_ONE:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1kb3JpcwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
    TRUSTSTORE_RDS_ROOT_CA:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1yZHMtY2EKZm9vYmFyCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
    UNRELATED_ENV: 'not-a-cert'
  }

  test('Should provide expected result with "certs"', () => {
    const results = getTrustStoreCerts(mockProcessEnvWithCerts)
    expect(results).toHaveLength(2)
    expect(results).toContainEqual(
      '-----BEGIN CERTIFICATE-----\nmock-cert-doris\n-----END CERTIFICATE-----'
    )
    expect(results).toContainEqual(
      '-----BEGIN CERTIFICATE-----\nmock-cert-rds-ca\nfoobar\n-----END CERTIFICATE-----'
    )
  })

  test('Should provide expected empty array', () => {
    expect(getTrustStoreCerts({})).toEqual([])
  })
})

describe('#getRdsCertificates', () => {
  const mockProcessEnvWithCerts = {
    TRUSTSTORE_CA_ONE:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1kb3JpcwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
    TRUSTSTORE_RDS_ROOT_CA:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1yZHMtY2EKZm9vYmFyCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
    TRUSTSTORE_RDS_OTHER:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1yZHMtb3RoZXIKYmF6Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
    UNRELATED_ENV: 'not-a-cert'
  }

  test('Should get only RDS certificates', () => {
    const results = getRdsCertificates(mockProcessEnvWithCerts)
    expect(results).toHaveLength(2)
    expect(results).toContainEqual(
      '-----BEGIN CERTIFICATE-----\nmock-cert-rds-ca\nfoobar\n-----END CERTIFICATE-----'
    )
    expect(results).toContainEqual(
      '-----BEGIN CERTIFICATE-----\nmock-cert-rds-other\nbaz\n-----END CERTIFICATE-----'
    )
    expect(results).not.toContainEqual(
      '-----BEGIN CERTIFICATE-----\nmock-cert-doris\n-----END CERTIFICATE-----'
    )
  })

  test('Should return empty array when no RDS certificates', () => {
    const mockEnvWithoutRds = {
      TRUSTSTORE_CA_ONE:
        'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1kb3JpcwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
      UNRELATED_ENV: 'not-a-cert'
    }
    expect(getRdsCertificates(mockEnvWithoutRds)).toEqual([])
  })

  test('Should provide expected empty array with empty env', () => {
    expect(getRdsCertificates({})).toEqual([])
  })
})
