import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/lib/auth"
import { TranscriptProvider } from "@/lib/transcript"
import { RequireAuth } from "@/components/RequireAuth"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { LoginPage } from "@/pages/LoginPage"
import { UploadPage } from "@/pages/UploadPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { CurriculumPage } from "@/pages/CurriculumPage"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <AuthProvider>
      <TranscriptProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/upload"
              element={
                <RequireAuth>
                  <UploadPage />
                </RequireAuth>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/curriculum" element={<CurriculumPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TranscriptProvider>
    </AuthProvider>
  )
}

export default App
