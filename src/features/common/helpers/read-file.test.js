import { readFile } from './read-file.js'
import fs from 'node:fs/promises'
import { vi } from 'vitest'

vi.mock('node:fs/promises')

describe('Read File', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    fs.readFile.mockResolvedValue('test')
  })

  it('should read a file', async () => {
    const result = await readFile('test.txt')
    expect(result).toBe('test')
  })
})
