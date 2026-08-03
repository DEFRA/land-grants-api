import { simpleGit } from 'simple-git'

export const getLatestVersion = async () => {
  const git = simpleGit()
  await git.fetch(['--tags'])
  // Use tags() to get all tags, then sort them by version
  // This works in detached HEAD state (CI) and normal branches (local)
  const tagList = await git.tags()
  const latestTag = tagList.latest
  return latestTag
}
