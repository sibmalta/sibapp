import React from 'react'

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
