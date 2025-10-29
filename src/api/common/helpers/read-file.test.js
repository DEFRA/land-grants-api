import { readFile } from './read-file.js'
import fs from 'fs/promises'

jest.mock('fs/promises')

describe('Read File', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    fs.readFile.mockResolvedValue('test')
  })

  it('should read a file', async () => {
    const result = await readFile('test.txt')
    expect(result).toBe('test')
  })
})
