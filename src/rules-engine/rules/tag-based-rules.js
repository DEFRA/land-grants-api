export function createNoTagRule(
  tag,
  message = `Application shouldn't have tag ${tag}`
) {
  return function doesntHaveTag(application) {
    if (application?.landParcel?.tags?.includes(tag)) {
      return { passed: false, message }
    }

    return { passed: true }
  }
}

export const isOutsideSda = createNoTagRule(
  'is-sda',
  'Land parcel is inside of a Severely Disadvantaged Area'
)
export const hasPeatySoil = createNoTagRule(
  'has-peaty-soil',
  'Land parcel has peaty soil'
)
export const noSSI = createNoTagRule(
  'has-sssi',
  'Land parcel has Site of Special Scientific Interest'
)
export const noHeferFeatures = createNoTagRule(
  'has-hefer-feature',
  'Land parcel has archeological features'
)
