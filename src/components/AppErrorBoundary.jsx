import React from 'react'

export class PayoutErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[PayoutErrorBoundary] Payout UI crash', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div role="alert" className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-orange-200 bg-orange-50 p-5 text-center shadow-sm dark:border-[rgba(232,117,26,0.35)] dark:bg-[#26322f]">
          <h1 className="text-lg font-black text-sib-text dark:text-[#f4efe7]">We couldn't load payout setup.</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-sib-muted dark:text-[#aeb8b4]">
            Your earnings are still safe. Try again, or return to your profile and come back later.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-2xl bg-sib-primary px-4 py-3 text-sm font-black text-white transition hover:bg-sib-primary/90"
            >
              Try again
            </button>
            <a
              href="/profile"
              className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-black text-sib-text transition hover:bg-orange-100 dark:border-[rgba(242,238,231,0.10)] dark:bg-[#202b28] dark:text-[#f4efe7] dark:hover:bg-[#30403c]"
            >
              Back to profile
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary] UI crash', error, info)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-sib-warm px-4 text-sib-text dark:bg-[#18211f] dark:text-[#f4efe7]">
        <div className="w-full max-w-sm rounded-2xl border border-sib-stone bg-white p-5 text-center shadow-sm dark:border-[rgba(242,238,231,0.10)] dark:bg-[#202b28]">
          <h1 className="text-lg font-black">Something went wrong.</h1>
          <p className="mt-2 text-sm font-semibold text-sib-muted dark:text-[#aeb8b4]">
            Refresh the page.
          </p>
          <button
            type="button"
            onClick={this.handleRefresh}
            className="mt-4 w-full rounded-2xl bg-sib-primary px-4 py-3 text-sm font-black text-white transition hover:bg-sib-primary/90"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }
}
