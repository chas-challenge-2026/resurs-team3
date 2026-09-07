import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'
import { AppLayout } from './components/layout/AppLayout'

function HomePlaceholder() {
  const { state } = useAuth()

  // TODO: swap this for WizardPage / BackofficePage once ApplicationContext
  // and CasesContext exist — for now this just confirms the login flow
  // reaches an authenticated, laid-out route.
  return <p className="text-white">Inloggad som {state.companyDisplayName || state.loginMethod}</p>
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
          AppLayout's <Outlet />, behind the same auth guard. */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
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
