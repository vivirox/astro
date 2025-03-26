import type { ComponentType, ReactNode } from 'react'

type ProviderType = ComponentType<{ children: ReactNode } & Record<string, any>>

/**
 * Composes multiple providers into a single provider component
 * Providers are applied from right to left (last provider wraps all others)
 *
 * @example
 * ```tsx
 * const ComposedProviders = composeProviders(
 *   AuthProvider,
 *   ThemeProvider,
 *   ConvexProvider
 * )
 *
 * // Use in your app:
 * <ComposedProviders>
 *   <App />
 * </ComposedProviders>
 * ```
 */
export function composeProviders(
  ...providers: ProviderType[]
): ComponentType<{ children: ReactNode } & Record<string, any>> {
  return providers.reduce(
    (Accumulated, Current) =>
      ({ children, ...props }) => (
        <Accumulated {...props}>
          <Current {...props}>{children}</Current>
        </Accumulated>
      ),
    ({ children }) => <>{children}</>,
  )
}

/**
 * Creates a provider composition with initial props for each provider
 *
 * @example
 * ```tsx
 * const Providers = createProviderComposition({
 *   auth: { initialUser: null },
 *   theme: { defaultTheme: 'dark' }
 * })(AuthProvider, ThemeProvider)
 *
 * // Use in your app:
 * <Providers>
 *   <App />
 * </Providers>
 * ```
 */
export function createProviderComposition(
  initialProps: Record<string, any> = {},
) {
  return (...providers: ProviderType[]) => {
    return ({
      children,
      ...props
    }: { children: ReactNode } & Record<string, any>) =>
      providers.reduceRight(
        (acc, Provider) => (
          <Provider {...initialProps} {...props}>
            {acc}
          </Provider>
        ),
        children,
      )
  }
}

/**
 * Type-safe provider props extractor
 * Extracts props type from a provider component
 */
export type ProviderProps<T> = T extends ComponentType<infer P> ? P : never

/**
 * Creates a strongly typed provider composition
 *
 * @example
 * ```tsx
 * const TypedProviders = createTypedProviderComposition(
 *   AuthProvider,
 *   ThemeProvider
 * )<{
 *   auth: { user: User },
 *   theme: { mode: 'light' | 'dark' }
 * }>()
 *
 * // Use with type checking:
 * <TypedProviders
 *   auth={{ user }}
 *   theme={{ mode: 'dark' }}
 * >
 *   <App />
 * </TypedProviders>
 * ```
 */
export function createTypedProviderComposition<
  T extends ProviderType,
  Props extends Record<string, any> = Record<string, any>,
>(...providers: T[]) {
  return <P extends Props>() =>
    ({ children, ...props }: { children: ReactNode } & P) =>
      providers.reduceRight(
        (acc, Provider) => <Provider {...props}>{acc}</Provider>,
        children,
      )
}
