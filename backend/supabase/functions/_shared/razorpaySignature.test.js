import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  hmacSha256Hex,
  safeEqual,
} from './razorpaySignature.ts'

describe('Razorpay signature helpers', () => {
  it('creates deterministic SHA-256 HMAC signatures', async () => {
    await expect(
      hmacSha256Hex('order|payment', 'secret')
    ).resolves.toBe(
      'ed638ae92b8fbd97bb56fa52599abb0155e4094f4ce9215f1b74db7c062640b4'
    )
  })

  it('compares equal-length signatures without early character exits', () => {
    expect(
      safeEqual('abc123', 'abc123')
    ).toBe(true)
    expect(
      safeEqual('abc123', 'abc124')
    ).toBe(false)
    expect(safeEqual('short', 'longer')).toBe(
      false
    )
  })
})
