import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

/**
 * Returns a function that navigates to `path` if the user is authenticated,
 * otherwise redirects to /auth with the intended destination preserved.
 */
export default function useAuthNav() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return useCallback(
    (path) => {
      if (user) {
        navigate(path)
      } else {
        navigate('/auth', { state: { from: path } })
      }
    },
    [user, navigate],
  )
}
