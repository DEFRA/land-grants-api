import { simpleGit } from 'simple-git'

export const getLatestVersion = async () => {
  const git = simpleGit()
  await git.fetch()
  const tags = await git.raw('describe', '--tags', '--abbrev=0')
  return tags.trim()
}
