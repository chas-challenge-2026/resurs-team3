// Adds the jest-dom matchers (toBeInTheDocument, toHaveAttribute, ...) to
// vitest's `expect`, imported once here via vitest.config.ts's setupFiles.
import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Without vitest's `globals: true`, @testing-library/react's automatic
// afterEach-cleanup can't find a global test-framework hook to attach to,
// so each render() in a test file stacks on top of the previous one's DOM
// instead of replacing it. Doing it explicitly here avoids turning on
// globals just for this.
afterEach(() => {
  cleanup()
})
