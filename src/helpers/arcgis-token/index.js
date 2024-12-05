import { config } from '~/src/config/index.js'
import { initCache } from '../cache.js'

const getUserToken = async () => {
  const url = new URL('https://www.arcgis.com/sharing/rest/generateToken')
  const body = new FormData()
  body.append('username', config.get('arcGis.username'))
  body.append('password', config.get('arcGis.password'))
  body.append('referer', '*')
  body.append('f', 'json')

  const response = await fetch(url, {
    method: 'post',
    body
  })

  /** @type { object } */
  const json = await response.json()

  return {
    id: 'token',
    access_token: json.token
  }
}

let cache

/**
 *  ArcGIS token cache
 * @param { import('@hapi/hapi').Server } server
 * @returns { import('@hapi/catbox').Policy<any, any> }
 */
export const arcgisTokenCache = (server) => {
  if (!cache) {
    cache = initCache(
      server,
      'arcgis_token',
      async () => {
        return await getUserToken()
      },
      {
        expiresIn: 7200
      }
    )
  }

  return cache
}
