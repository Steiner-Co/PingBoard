export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status })
}

export function noContent(headers: HeadersInit = {}): Response {
  return new Response(null, { status: 204, headers })
}
