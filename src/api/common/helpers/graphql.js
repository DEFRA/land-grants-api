import fetch from "node-fetch";

export async function queryGraphQL(endpoint, query, headers = {}, variables = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      query,
      variables
    })
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors.map(e => e.message).join(', '));
  }
  return data;
}
