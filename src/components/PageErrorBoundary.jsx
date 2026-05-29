import { Component } from 'react'

export default class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('Page error:', error) }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-8">
          <p className="text-sm font-medium text-[#111]">Ocurrió un error en esta página.</p>
          <p className="text-xs text-[#888] max-w-sm text-center">{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.history.back() }}
            className="text-sm border border-[#D9D9D9] px-4 py-2 rounded-sm text-[#111] hover:border-[#111] transition-colors"
          >
            Volver
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
