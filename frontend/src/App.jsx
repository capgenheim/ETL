import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from './contexts/AuthContext';
import bloombergTheme from './theme/bloombergTheme';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DashboardLayout from './layouts/DashboardLayout';
import SourceFilesPage from './pages/transformation/SourceFilesPage';
import CanvasListPage from './pages/transformation/CanvasListPage';
import CreatePackagePage from './pages/transformation/CreatePackagePage';
import PackageListPage from './pages/transformation/PackageListPage';
import AuditPage from './pages/AuditPage';

function App() {
    return (
        <ThemeProvider theme={bloombergTheme}>
            <CssBaseline />
            <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                autoHideDuration={4000}
            >
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<LoginPage />} />

                            {/* Protected Routes */}
                            <Route element={<DashboardLayout />}>
                                <Route path="/dashboard" element={<DashboardPage />} />

                                {/* Transformation Panel */}
                                <Route path="/transformation/source-files" element={<SourceFilesPage />} />
                                <Route path="/transformation/canvas-list" element={<CanvasListPage />} />
                                <Route path="/transformation/create-package" element={<CreatePackagePage />} />
                                <Route path="/transformation/package-list" element={<PackageListPage />} />

                                {/* Audit Panel */}
                                <Route path="/audit" element={<AuditPage />} />
                            </Route>

                            {/* Default redirect */}
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </SnackbarProvider>
        </ThemeProvider>
    );
}

export default App;
