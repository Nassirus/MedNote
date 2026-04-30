import { Component } from 'react'
import { IcAlert } from './Icons'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Screen crash:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16, minHeight: '100dvh',
          justifyContent: 'center', background: 'var(--bg)' }}>
          <IcAlert size={40} color="var(--warning)"/>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            Ошибка загрузки экрана
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center',
            background: 'var(--surface2)', padding: '10px 14px', borderRadius: 9,
            maxWidth: 320, wordBreak: 'break-all' }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn btn-primary" style={{ padding: '10px 24px' }}>
            Попробовать снова
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
