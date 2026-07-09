import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for performance code-splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const CreateCampaign = lazy(() => import('./pages/CreateCampaign'));
const EditCampaign = lazy(() => import('./pages/EditCampaign'));
const DonorDashboard = lazy(() => import('./pages/DonorDashboard'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const KycVerification = lazy(() => import('./pages/KycVerification'));

function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'CREATOR') {
    if (user.kycStatus !== 'APPROVED') {
      return <Navigate to="/kyc-verification" replace />;
    }
    return <Navigate to="/creator" replace />;
  }

  return <Navigate to="/donor" replace />;
}

function App() {
  const LoadingFallback = (
    <div className="min-h-screen bg-darkbg flex flex-col justify-center items-center">
      <div className="animate-float">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary"></div>
      </div>
      <p className="mt-4 text-textSecondary text-sm font-medium">Loading...</p>
    </div>
  );

  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-darkbg text-textPrimary">
          <Navbar />
          <main className="flex-grow">
            <Suspense fallback={LoadingFallback}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/campaigns/:id" element={<CampaignDetails />} />
                <Route path="/leaderboard" element={<Leaderboard />} />

                {/* Shared Protected Routes */}
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRedirect />
                    </ProtectedRoute>
                  }
                />

                {/* Donor Specific Dashboard */}
                <Route 
                  path="/donor" 
                  element={
                    <ProtectedRoute allowedRoles={['DONOR']}>
                      <DonorDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Creator Specific Dashboard & Creation wizard */}
                <Route 
                  path="/creator" 
                  element={
                    <ProtectedRoute allowedRoles={['CREATOR']} requireApprovedKyc>
                      <CreatorDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/create-campaign" 
                  element={
                    <ProtectedRoute allowedRoles={['CREATOR', 'ADMIN']} requireApprovedKyc>
                      <CreateCampaign />
                    </ProtectedRoute>
                  } 
                />
                
                <Route
                  path="/campaigns/:id/edit"
                  element={
                    <ProtectedRoute allowedRoles={['CREATOR', 'ADMIN']}>
                      <EditCampaign />
                    </ProtectedRoute>
                  }
                />

                <Route 
                  path="/kyc-verification" 
                  element={
                    <ProtectedRoute allowedRoles={['CREATOR']}>
                      <KycVerification />
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Specific Dashboard */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;