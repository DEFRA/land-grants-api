export const deepSearch = (data, value) => {
  if (data.code === value) return data

  for (const key of ['classes', 'covers', 'uses']) {
    if (data[key]) {
      for (const item of data[key]) {
        const result = deepSearch(item, value)
        if (result) return result
      }
    }
  }

  return null
}
