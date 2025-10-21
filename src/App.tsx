import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminPasswordReset from "./pages/AdminPasswordReset";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Lists from "./pages/Lists";
import Analytics from "./pages/Analytics";
import VimeoTest from "./pages/VimeoTest";
import SupabaseTest from "./pages/SupabaseTest";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { PlaylistProvider } from "./hooks/usePlaylist";
import Playlist from "./pages/Playlist";
import AdminUsers from "./pages/AdminUsers";
import Settings from "./pages/Settings";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PlaylistProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/password-reset" element={<AdminPasswordReset />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              } />
              <Route path="/playlist" element={
                <ProtectedRoute>
                  <Playlist />
                </ProtectedRoute>
              } />
              <Route path="/lists" element={
                <ProtectedRoute>
                  <Lists />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <AdminRoute>
                  <Analytics />
                </AdminRoute>
              } />
              <Route path="/vimeo-test" element={<VimeoTest />} />
              <Route path="/supabase-test" element={<SupabaseTest />} />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PlaylistProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
