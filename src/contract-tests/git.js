import { simpleGit } from 'simple-git'

export const getLatestVersion = async () => {
  const git = simpleGit()
  const latestTag = await git.raw('describe', '--tags', '--abbrev=0')
  return latestTag.trim()
}
