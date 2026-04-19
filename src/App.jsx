/**
 * Main App Component - Routes and Global Layout
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ElectionProvider } from './context/ElectionContext';
import { FloatingVideoProvider } from './context/FloatingVideoContext';

// Pages
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import PollingUnitLogin from './pages/PollingUnitLogin';
import AdminDashboard from './pages/AdminDashboard';
import PollingUnitDashboard from './pages/PollingUnitDashboard';
import ResultCenterPage from './pages/ResultCenterPage';

// Components
import LoadingSpinner from './components/Common/LoadingSpinner';
import FloatingVideoPlayer from './components/Common/FloatingVideoPlayer';

// Protected Route component
const ProtectedRoute = ({ children, requireType = null }) => {
    const { isAuthenticated, loading, userType } = useAuth();

    if (loading) return <LoadingSpinner />;

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (requireType && userType !== requireType) {
        const redirectPath = userType === 'admin' ? '/admin' : '/polling-unit';
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

function AppRoutes() {
    const { isAuthenticated, userType, loading } = useAuth();

    if (loading) return <LoadingSpinner />;

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/result-center" element={<ResultCenterPage />} />

            {/* Auth Routes */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/polling-unit-login" element={<PollingUnitLogin />} />

            {/* Admin Routes */}
            <Route
                path="/admin/*"
                element={
                    <ProtectedRoute requireType="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            {/* Polling Unit Routes */}
            <Route
                path="/polling-unit/*"
                element={
                    <ProtectedRoute requireType="polling-unit">
                        <PollingUnitDashboard />
                    </ProtectedRoute>
                }
            />

            {/* Redirect based on auth status */}
            <Route
                path="/login"
                element={
                    isAuthenticated ? (
                        <Navigate
                            to={userType === 'admin' ? '/admin' : '/polling-unit'}
                            replace
                        />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />

            {/* Catch all - redirect to landing or home based on auth status */}
            <Route
                path="*"
                element={
                    isAuthenticated ? (
                        <Navigate
                            to={userType === 'admin' ? '/admin' : '/polling-unit'}
                            replace
                        />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <FloatingVideoProvider>
                    <ElectionProvider>
                        <div className="App">
                            <AppRoutes />
                            <FloatingVideoPlayer />
                        </div>
                    </ElectionProvider>
                </FloatingVideoProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
