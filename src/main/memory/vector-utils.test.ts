import assert from 'node:assert/strict'
import test from 'node:test'
import {
  serializeFloat32Vector,
  deserializeFloat32Vector,
  validateFiniteVector
} from './vector-utils'

test('serializeFloat32Vector produces correct BLOB size (4 bytes per dimension)', () => {
  const vector = [0.1, 0.2, 0.3, 0.4, 0.5]
  const blob = serializeFloat32Vector(vector)

  assert.ok(blob !== null)
  assert.equal(blob!.byteLength, vector.length * 4)
})

test('serializeFloat32Vector round-trips preserve vector values', () => {
  const original = [1.0, -0.5, 0.0, 3.14, -2.718]
  const blob = serializeFloat32Vector(original)
  const restored = deserializeFloat32Vector(blob)

  assert.ok(restored !== null)
  assert.equal(restored!.length, original.length)

  for (let i = 0; i < original.length; i += 1) {
    assert.ok(
      Math.abs(restored![i] - original[i]) < 1e-6,
      `Element ${i}: expected ~${original[i]}, got ${restored![i]}`
    )
  }
})

test('serializeFloat32Vector returns null for null, undefined, and empty input', () => {
  assert.equal(serializeFloat32Vector(null), null)
  assert.equal(serializeFloat32Vector(undefined), null)
  assert.equal(serializeFloat32Vector([]), null)
})

test('serializeFloat32Vector throws for non-finite values', () => {
  assert.throws(() => serializeFloat32Vector([1.0, NaN, 3.0]), /finite/)
  assert.throws(() => serializeFloat32Vector([Infinity, 1.0]), /finite/)
  assert.throws(() => serializeFloat32Vector([-Infinity]), /finite/)
})

test('deserializeFloat32Vector returns null for null and empty input', () => {
  assert.equal(deserializeFloat32Vector(null), null)
  assert.equal(deserializeFloat32Vector(new Uint8Array(0)), null)
})

test('deserializeFloat32Vector returns null for misaligned input', () => {
  // 5 bytes is not divisible by 4
  assert.equal(deserializeFloat32Vector(new Uint8Array(5)), null)
})

test('validateFiniteVector rejects empty and non-finite vectors', () => {
  assert.equal(validateFiniteVector([]), false)
  assert.equal(validateFiniteVector([NaN]), false)
  assert.equal(validateFiniteVector([1.0, Infinity]), false)
  assert.equal(validateFiniteVector([1.0, 2.0, 3.0]), true)
})

test('serializeFloat32Vector preserves dimension count through round-trip', () => {
  const dimensions = [1, 3, 128, 384, 1536]

  for (const dim of dimensions) {
    const vector = Array.from({ length: dim }, (_, i) => i * 0.001)
    const blob = serializeFloat32Vector(vector)
    const restored = deserializeFloat32Vector(blob)

    assert.ok(restored !== null, `Failed for dimension ${dim}`)
    assert.equal(restored!.length, dim, `Dimension mismatch for ${dim}`)
  }
})
