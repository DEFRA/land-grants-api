import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Pool } from 'pg'
import { config } from '../../../config/index.js'
import { getDBOptions, createDBPool, postgresDb } from './postgres.js'
import { getStats } from '../../statistics/queries/stats.query.js'

vi.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: vi.fn()
}))

vi.mock('@aws-sdk/rds-signer', () => ({
  Signer: vi.fn()
}))

vi.mock('pg', () => ({
  Pool: vi.fn()
}))

vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('../../statistics/queries/stats.query.js', () => ({
  getStats: vi.fn().mockResolvedValue()
}))

describe('Postgres Helper', () => {
  beforeEach(() => {
    config.get = vi.fn((value) => (value === 'isTest' ? false : 'test-value'))
    vi.mocked(Pool).mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getDBOptions', () => {
    test('should return database options from config', () => {
      const result = getDBOptions()

      expect(result).toEqual({
        user: 'test-value',
        database: 'test-value',
        host: 'test-value',
        passwordForLocalDev: 'test-value',
        isLocal: 'test-value',
        region: 'test-value',
        loadPostgresData: 'test-value'
      })
      expect(config.get).toHaveBeenCalledWith('postgres.user')
      expect(config.get).toHaveBeenCalledWith('postgres.database')
      expect(config.get).toHaveBeenCalledWith('postgres.host')
      expect(config.get).toHaveBeenCalledWith('postgres.passwordForLocalDev')
      expect(config.get).toHaveBeenCalledWith('isLocal')
      expect(config.get).toHaveBeenCalledWith('postgres.region')
      expect(config.get).toHaveBeenCalledWith('loadPostgresData')
    })

    test('should return database options from config for test environment', () => {
      config.get = vi.fn((value) => (value === 'isTest' ? true : 'test-value'))
      const result = getDBOptions()

      expect(result).toEqual({
        user: 'test-value',
        database: 'test-value',
        host: 'test-value',
        password: 'test-value',
        port: 5432
      })
      expect(config.get).toHaveBeenCalledWith('postgres.user')
      expect(config.get).toHaveBeenCalledWith('postgres.database')
      expect(config.get).toHaveBeenCalledWith('postgres.host')
      expect(config.get).toHaveBeenCalledWith('postgres.passwordForLocalDev')
    })

    test('should handle undefined config values', () => {
      config.get = vi.fn(() => undefined)

      const result = getDBOptions()

      expect(result).toEqual({
        user: undefined,
        database: undefined,
        host: undefined,
        passwordForLocalDev: undefined,
        isLocal: undefined,
        region: undefined,
        loadPostgresData: undefined
      })
    })
  })

  describe('createDBPool', () => {
    let mockPool

    beforeEach(() => {
      mockPool = {
        connect: vi.fn(),
        end: vi.fn()
      }
      vi.mocked(Pool).mockImplementation(() => mockPool)
    })

    describe('local development', () => {
      test('should create pool with local password for local development', () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          passwordForLocalDev: 'local-password',
          isLocal: true
        }

        const mockServer = {
          logger: {
            info: vi.fn()
          }
        }

        createDBPool(options, mockServer)

        expect(Pool).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 5432,
            user: 'test-user',
            host: 'localhost',
            database: 'test-db',
            maxLifetimeSeconds: 600
          })
        )
      })

      test('should create pool without SSL for local development', () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true
        }

        const mockServer = {
          logger: { info: vi.fn() },
          secureContext: {}
        }

        createDBPool(options, mockServer)

        const poolConfig = vi.mocked(Pool).mock.calls[0][0]
        expect(poolConfig.ssl).toBeUndefined()
      })

      test('should use password function that returns local password', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          passwordForLocalDev: 'my-local-password',
          isLocal: true
        }

        const mockServer = {
          logger: {
            info: vi.fn()
          }
        }

        createDBPool(options, mockServer)

        const poolConfig = vi.mocked(Pool).mock.calls[0][0]
        const password = await poolConfig.password()

        expect(password).toBe('my-local-password')
        expect(mockServer.logger.info).toHaveBeenCalledWith(
          'Getting Postgres authentication token'
        )
      })
    })

    describe('not local development', () => {
      test('should create pool with token for remote environment', async () => {
        const mockCredentials = { mock: 'credentials' }
        vi.mocked(fromNodeProviderChain).mockReturnValue(mockCredentials)

        const mockGetAuthToken = vi.fn().mockResolvedValue('rds-auth-token')
        vi.mocked(Signer).mockImplementation(() => ({
          getAuthToken: mockGetAuthToken
        }))

        const options = {
          user: 'remote-user',
          database: 'remote-db',
          host: 'remote-host',
          isLocal: false,
          region: 'eu-west-1'
        }

        const mockServer = {
          logger: {
            info: vi.fn()
          }
        }

        createDBPool(options, mockServer)

        const poolConfig = vi.mocked(Pool).mock.calls[0][0]
        const password = await poolConfig.password()

        expect(Signer).toHaveBeenCalledWith({
          hostname: 'remote-host',
          port: 5432,
          username: 'remote-user',
          credentials: mockCredentials,
          region: 'eu-west-1'
        })
        expect(fromNodeProviderChain).toHaveBeenCalled()
        expect(mockGetAuthToken).toHaveBeenCalled()
        expect(password).toBe('rds-auth-token')
      })

      test('should create pool with SSL when secureContext is provided', () => {
        const options = {
          user: 'remote-user',
          database: 'remote-db',
          host: 'remote-host',
          isLocal: false,
          region: 'eu-west-1'
        }

        const mockSecureContext = { mock: 'context' }
        const mockServer = {
          logger: { info: vi.fn() },
          secureContext: mockSecureContext
        }

        createDBPool(options, mockServer)

        const poolConfig = vi.mocked(Pool).mock.calls[0][0]
        expect(poolConfig.ssl).toEqual({
          secureContext: mockSecureContext
        })
      })

      test('should handle error when getting token fails', async () => {
        const mockCredentials = { mock: 'credentials' }
        vi.mocked(fromNodeProviderChain).mockReturnValue(mockCredentials)

        const tokenError = new Error('Failed to get auth token')
        const mockGetAuthToken = vi.fn().mockRejectedValue(tokenError)
        vi.mocked(Signer).mockImplementation(() => ({
          getAuthToken: mockGetAuthToken
        }))

        const options = {
          user: 'remote-user',
          database: 'remote-db',
          host: 'remote-host',
          isLocal: false,
          region: 'eu-west-1'
        }

        const mockServer = {
          logger: {
            info: vi.fn(),
            error: vi.fn()
          }
        }

        createDBPool(options, mockServer)

        const poolConfig = vi.mocked(Pool).mock.calls[0][0]
        await expect(poolConfig.password()).rejects.toThrow(
          'Failed to get auth token'
        )

        expect(mockServer.logger.info).toHaveBeenCalledWith(
          'Getting Postgres authentication token'
        )
        expect(mockServer.logger.error).toHaveBeenCalledWith(
          'Failed to get Postgres authentication token',
          {
            error: 'Failed to get auth token',
            user: 'remote-user',
            host: 'remote-host'
          }
        )
      })
    })

    test('should create pool with no server', () => {
      const options = {
        user: 'test-user',
        database: 'test-db',
        host: 'localhost',
        isLocal: true
      }

      createDBPool(options)

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 5432,
          user: 'test-user',
          database: 'test-db'
        })
      )
    })

    test('should create pool for test environment', () => {
      config.get = vi.fn((value) => (value === 'isTest' ? true : 'test-value'))
      const options = {
        user: 'test-user',
        database: 'test-db',
        host: 'localhost',
        password: 'test-password',
        port: 5433
      }

      createDBPool(options)

      expect(Pool).toHaveBeenCalledWith({
        port: 5433,
        user: 'test-user',
        password: 'test-password',
        host: 'localhost',
        database: 'test-db'
      })
    })

    test('should use default port for test environment when port not provided', () => {
      config.get = vi.fn((value) => (value === 'isTest' ? true : 'test-value'))
      const options = {
        user: 'test-user',
        database: 'test-db',
        host: 'localhost',
        password: 'test-password'
      }

      createDBPool(options)

      expect(Pool).toHaveBeenCalledWith({
        port: 5432,
        user: 'test-user',
        password: 'test-password',
        host: 'localhost',
        database: 'test-db'
      })
    })

    test('should handle server with missing logger gracefully', async () => {
      const options = {
        user: 'test-user',
        database: 'test-db',
        host: 'localhost',
        passwordForLocalDev: 'password',
        isLocal: true
      }

      const mockServer = {}

      createDBPool(options, mockServer)

      const poolConfig = vi.mocked(Pool).mock.calls[0][0]
      const password = await poolConfig.password()

      expect(password).toBe('password')
    })
  })

  describe('postgresDb plugin', () => {
    let mockPool
    let mockServer
    let mockClient

    beforeEach(() => {
      mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ count: '0' }] }),
        release: vi.fn()
      }

      mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        connect: vi.fn().mockResolvedValue(mockClient),
        end: vi.fn().mockResolvedValue(),
        on: vi.fn(),
        totalCount: 0
      }

      vi.mocked(Pool).mockImplementation(() => mockPool)

      mockServer = {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn()
        },
        decorate: vi.fn(),
        events: {
          on: vi.fn()
        }
      }
    })

    describe('plugin metadata', () => {
      test('should have correct plugin name and version', () => {
        expect(postgresDb.plugin.name).toBe('postgres')
        expect(postgresDb.plugin.version).toBe('1.0.0')
      })

      test('should have options property', () => {
        const options = postgresDb.options

        expect(options).toBeDefined()
        expect(typeof options).toBe('object')
        expect(options).toHaveProperty('user')
        expect(options).toHaveProperty('database')
        expect(options).toHaveProperty('host')
        expect(options).toHaveProperty('isLocal')
        expect(options).toHaveProperty('region')
        expect(options).toHaveProperty('loadPostgresData')
      })
    })

    describe('plugin registration', () => {
      test('should successfully register and connect to postgres', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        await postgresDb.plugin.register(mockServer, options)

        expect(mockServer.logger.info).toHaveBeenCalledWith(
          'Setting up postgres'
        )
        expect(vi.mocked(getStats)).toHaveBeenCalledWith(
          mockServer.logger,
          mockPool
        )
        expect(mockServer.decorate).toHaveBeenCalledWith(
          'server',
          'postgresDb',
          mockPool
        )
        expect(mockPool.on).toHaveBeenCalledWith(
          'connect',
          expect.any(Function)
        )
        expect(mockPool.on).toHaveBeenCalledWith(
          'acquire',
          expect.any(Function)
        )
        expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function))
      })

      test('should register stop event handler', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        await postgresDb.plugin.register(mockServer, options)

        expect(mockServer.events.on).toHaveBeenCalledWith(
          'stop',
          expect.any(Function)
        )
        expect(vi.mocked(getStats)).toHaveBeenCalledWith(
          mockServer.logger,
          mockPool
        )
      })

      test('should close pool on server stop event', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        await postgresDb.plugin.register(mockServer, options)

        // Get the stop event handler
        const stopHandler = vi
          .mocked(mockServer.events.on)
          .mock.calls.find((call) => call[0] === 'stop')[1]

        // Trigger the stop event
        await stopHandler()

        expect(mockServer.logger.info).toHaveBeenCalledWith(
          'Closing Postgres pool'
        )
        expect(mockPool.end).toHaveBeenCalled()
      })

      test('should handle connection failure', async () => {
        const connectionError = new Error('Connection refused')
        vi.mocked(getStats).mockRejectedValue(connectionError)

        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        await expect(
          postgresDb.plugin.register(mockServer, options)
        ).rejects.toThrow('Connection refused')

        expect(mockServer.logger.error).toHaveBeenCalledWith(
          { err: connectionError },
          'Failed to connect to Postgres'
        )
        expect(mockServer.decorate).not.toHaveBeenCalled()
      })

      test('should invoke connect event handler', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        let connectHandler
        mockPool.on.mockImplementation((event, handler) => {
          if (event === 'connect') {
            connectHandler = handler
          }
        })

        await postgresDb.plugin.register(mockServer, options)

        connectHandler()

        expect(mockServer.logger.debug).toHaveBeenCalledWith(
          'New client connected'
        )
      })

      test('should invoke acquire event handler', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        let acquireHandler
        mockPool.on.mockImplementation((event, handler) => {
          if (event === 'acquire') {
            acquireHandler = handler
          }
        })

        await postgresDb.plugin.register(mockServer, options)

        acquireHandler()

        expect(mockServer.logger.debug).toHaveBeenCalledWith(
          'Client acquired from pool'
        )
      })

      test('should invoke remove event handler', async () => {
        const options = {
          user: 'test-user',
          database: 'test-db',
          host: 'localhost',
          isLocal: true,
          region: 'eu-west-2'
        }

        let removeHandler
        mockPool.on.mockImplementation((event, handler) => {
          if (event === 'remove') {
            removeHandler = handler
          }
        })

        await postgresDb.plugin.register(mockServer, options)

        removeHandler()

        expect(mockServer.logger.debug).toHaveBeenCalledWith(
          'Client removed from pool'
        )
      })
    })
  })
})
