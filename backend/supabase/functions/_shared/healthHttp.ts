export function healthJsonResponse(
  body: Record<string, unknown>,
  {
    status = 200,
    head = false,
  }: {
    status?: number
    head?: boolean
  } = {}
) {
  return new Response(
    head ? null : JSON.stringify(body),
    {
      status,
      headers: {
        'Cache-Control':
          'no-store, max-age=0',
        'Content-Type':
          'application/json; charset=utf-8',
        'X-Content-Type-Options':
          'nosniff',
      },
    }
  )
}

export function validateHealthMethod(
  request: Request
) {
  const method =
    request.method.toUpperCase()

  return {
    allowed:
      method === 'GET' ||
      method === 'HEAD',
    head: method === 'HEAD',
  }
}
