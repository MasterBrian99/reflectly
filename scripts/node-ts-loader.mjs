/**
 * @returns {Promise<import('node:module').ResolveFnOutput>}
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch (error) {
      void error
    }

    try {
      return await nextResolve(`${specifier}/index.ts`, context)
    } catch (error) {
      void error
    }
  }

  return nextResolve(specifier, context)
}
