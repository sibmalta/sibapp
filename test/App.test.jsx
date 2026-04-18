import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { AuthProvider } from '../lib/auth-context'
import App from '../App'

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = renderApp()
    expect(container).toBeTruthy()
  })

  it('renders content on the page', () => {
    const { container } = renderApp()
    expect(container.innerHTML.length).toBeGreaterThan(0)
  })
})
