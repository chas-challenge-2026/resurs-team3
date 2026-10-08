// Registers jest-dom's matchers (toBeInTheDocument, toHaveAttribute, ...) on
// vitest's `expect`. This file itself runs once per test file — it's wired
// in via vitest.config.ts's `setupFiles`.
import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// @testing-library/react normally unmounts and clears the DOM after each
// test on its own, but it only does that if it finds a global `afterEach`
// to hook into (what vitest's `globals: true` option provides). This
// project doesn't turn globals on, so that auto-cleanup never fires —
// without the call below, every test's render() would pile its output on
// top of the previous test's instead of starting from an empty DOM.
afterEach(() => {
  cleanup()
})
