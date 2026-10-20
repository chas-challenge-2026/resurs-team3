import { Component, type ReactNode } from 'react'
import styles from './ViewErrorBoundary.module.css'

interface Props { children: ReactNode }
interface State { failed: boolean }

/**
 * One broken record must not blank the whole portal. A view that throws
 * while rendering is replaced by this notice; the header, tabs and the
 * other views keep working. Keyed by view in BackofficeLayout, so switching
 * tabs also resets it.
 */
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Backoffice view failed to render', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className={styles.notice}>
        <h1>Vyn kunde inte visas</h1>
        <p>
          Något i ärendedata gick inte att läsa. Övriga flikar fungerar. Försök igen, eller ladda om sidan om felet kvarstår.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          className={styles.retry}
        >
          Försök igen
        </button>
      </div>
    )
  }
}
