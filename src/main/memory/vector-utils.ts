/**
 * Float32 vector serialization utilities for sqlite-vector BLOB storage.
 *
 * Vectors are stored as little-endian Float32 BLOBs. Each element occupies
 * 4 bytes, so a 1536-dimension vector becomes a 6144-byte BLOB.
 */

/**
 * Validates that every element in the vector is a finite number.
 */
export function validateFiniteVector(vector: number[]): boolean {
  return vector.length > 0 && vector.every((value) => Number.isFinite(value))
}

/**
 * Serializes a number array into a little-endian Float32 Buffer suitable
 * for SQLite BLOB storage with sqlite-vector.
 *
 * Returns `null` for null, undefined, or empty vectors.
 * Throws if any element is non-finite (NaN, Infinity).
 */
export function serializeFloat32Vector(vector?: number[] | null): Buffer | null {
  if (!vector?.length) {
    return null
  }

  if (!validateFiniteVector(vector)) {
    throw new Error(
      'Cannot serialize vector: all elements must be finite numbers. ' +
        'Found NaN or Infinity values.'
    )
  }

  const float32 = new Float32Array(vector)
  return Buffer.from(float32.buffer, float32.byteOffset, float32.byteLength)
}

/**
 * Deserializes a BLOB (Uint8Array) back into a number array.
 *
 * Returns `null` for null or empty input.
 */
export function deserializeFloat32Vector(blob: Uint8Array | null): number[] | null {
  if (!blob?.length) {
    return null
  }

  if (blob.byteLength % 4 !== 0) {
    return null
  }

  const float32 = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4)
  return Array.from(float32)
}
