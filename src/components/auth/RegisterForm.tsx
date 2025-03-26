import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface RegisterFormProps {
  redirectTo?: string
  showLogin?: boolean
}

export function RegisterForm({
  redirectTo,
  showLogin = true,
}: RegisterFormProps) {
  const { signUp, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccessful, setIsSuccessful] = useState<boolean>(false)
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    if (!acceptTerms) {
      setErrorMessage('You must accept the Terms of Service and Privacy Policy')
      setIsLoading(false)
      return
    }

    try {
      const metadata = { fullName }
      const response = await signUp(email, password, metadata)

      if (response.error) {
        setErrorMessage(response.error.message || 'Registration failed')
        return
      }

      const data = await response.data
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const data = await signInWithOAuth('google', redirectTo)

      if (data && data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to initiate Google sign-in')
      }
    } catch (error) {
      setErrorMessage((error as Error).message)
      setIsLoading(false)
    }
  }

  if (isSuccessful) {
    return (
      <div className="auth-success">
        <h2>Registration Successful</h2>
        <p>
          Please check your email to verify your account. If you don't see i
          within a few minutes, check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <div className="auth-form-container">
      <h2>Create Account</h2>

      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={isLoading}
            placeholder="John Doe"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={8}
            placeholder="••••••••"
          />
          <small>Password must be at least 8 characters long</small>
        </div>

        <div className="form-group">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
              disabled={isLoading}
            />
            <label htmlFor="terms">
              I agree to the{' '}
              <a href="/terms" target="_blank">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank">
                Privacy Policy
              </a>
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-separator">
        <span>OR</span>
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="btn btn-outline"
        disabled={isLoading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 186.69 190.5"
        >
          <path
            fill="#4285f4"
            d="M95.25 77.932v36.888h51.262c-2.251 11.863-9.006 21.908-19.137 28.662l30.913 23.986c18.011-16.625 28.402-41.044 28.402-70.052 0-6.754-.606-13.249-1.732-19.483z"
          />
          <path
            fill="#34a853"
            d="M41.869 113.38l-6.972 5.337-24.679 19.223c15.673 31.086 47.796 52.561 85.03 52.561 25.717 0 47.278-8.486 63.038-23.033l-30.913-23.986c-8.486 5.715-19.31 9.179-32.125 9.179-24.765 0-45.806-16.712-53.34-39.226z"
          />
          <path
            fill="#fbbc05"
            d="M41.873 77.121c-3.042 8.99-4.726 18.453-4.726 28.28 0 9.832 1.689 19.29 4.726 28.28l31.65-24.542c-1.665-4.705-2.695-9.676-2.695-14.865 0-5.184 1.03-10.157 2.695-14.862z"
          />
          <path
            fill="#ea4335"
            d="M95.25 47.927c12.68 0 24.062 4.36 33.026 12.847l27.509-27.37C139.211 19.498 118.821 8.58 95.25 8.58 57.979 8.58 25.869 30.047 10.199 61.137l31.667 24.582c7.524-22.502 28.566-39.226 53.334-39.226z"
          />
        </svg>
        <span className="ml-2">Continue with Google</span>
      </button>

      {showLogin && (
        <div className="auth-links">
          <a href="/login" className="login-link">
            Already have an account? Log in
          </a>
        </div>
      )}
    </div>
  )
}
