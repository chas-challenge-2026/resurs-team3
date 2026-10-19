import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Clear the DOM after each test (globals are disabled).
afterEach(() => {
  cleanup()
})
