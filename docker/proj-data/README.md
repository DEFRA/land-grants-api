# PROJ grid data

## `uk_os_OSTN15_NTv2_OSGBtoETRS.tif`

Ordnance Survey's OSTN15 transformation grid, which converts between OSGB36
(the datum British National Grid sits on) and ETRS89/WGS84.

Without it, PROJ silently falls back to a Helmert approximation and every
British National Grid to WGS84 conversion lands around a metre out of position,
with no error raised anywhere. Every deployed Aurora environment has this grid
but the stock `postgis/postgis` image ships grids for several countries but not
the UK, so it is copied into our images instead.

Held here rather than downloaded during the build so that neither local
development nor CI depends on an external host being reachable.

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| Source       | <https://cdn.proj.org/uk_os_OSTN15_NTv2_OSGBtoETRS.tif>            |
| Published by | The PROJ project, from Ordnance Survey's OSTN15 release            |
| SHA-256      | `5d6ed64d2119952c4c559fa1fccbc594b6520fc3ec3ef2fc10be13202c4384fa` |
| Size         | 3,035,814 bytes                                                    |
| Retrieved    | 2026-09-04                                                         |

OSTN15 has been stable since 2015 and there is no version to track. If Ordnance
Survey ever supersede it, the replacement will have a different filename and
the transformation identifier in `coordinate-systems.js` will need updating too.

To verify this copy against the published one:

```bash
curl -fsSL https://cdn.proj.org/uk_os_OSTN15_NTv2_OSGBtoETRS.tif | shasum -a 256
```
