import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'
import { AppLayout } from './components/layout/AppLayout'
import { BackofficeLayout } from './pages/backoffice/BackofficeLayout'

function HomePlaceholder() {
  const { state } = useAuth()

  // TODO: swap this for WizardPage once ApplicationContext exists — for now
  // this just confirms the applicant login flow reaches an authenticated,
  // laid-out route.
  return <p className="text-white">Inloggad som {state.companyDisplayName || state.loginMethod}</p>
}

// Case workers get the backoffice shell instead of the applicant layout.
// BackofficeLayout manages its own internal sections rather than nested
// routes, so it ignores the nested "/" route below when it renders.
function AuthedRoot() {
  const { state } = useAuth()
  return state.loginMethod === 'handlaggare' ? <BackofficeLayout /> : <AppLayout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* Pathless layout route: everything nested inside renders through
          AuthedRoot — AppLayout's <Outlet /> for companies, or the
          self-contained BackofficeLayout for case workers — behind the
          same auth guard. */}
      <Route
        element={
          <ProtectedRoute>
            <AuthedRoot />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePlaceholder />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
