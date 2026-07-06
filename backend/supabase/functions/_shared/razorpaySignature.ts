function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) =>
      byte.toString(16).padStart(2, '0')
    )
    .join('')
}

export async function hmacSha256Hex(
  message: string,
  secret: string
) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const signature =
    await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(message)
    )

  return toHex(signature)
}

export function safeEqual(
  first: string,
  second: string
) {
  if (first.length !== second.length) {
    return false
  }

  let result = 0

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    result |=
      first.charCodeAt(index) ^
      second.charCodeAt(index)
  }

  return result === 0
}
