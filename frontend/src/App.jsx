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
import UploadSectionPage from './pages/transformation/UploadSectionPage';
import CanvasListPage from './pages/transformation/CanvasListPage';
import CreatePackagePage from './pages/transformation/CreatePackagePage';
import PackageListPage from './pages/transformation/PackageListPage';
import PackageMappingPage from './pages/transformation/PackageMappingPage';
import FileManagerPage from './pages/transformation/FileManagerPage';
import UnprocessedFilesPage from './pages/transformation/UnprocessedFilesPage';
import AuditPage from './pages/AuditPage';
import SwiftPage from './pages/SwiftPage';
import SwiftParameterPage from './pages/SwiftParameterPage';
import SwiftPackagePage from './pages/SwiftPackagePage';
import ErrorPage from './pages/ErrorPage';

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
                                <Route path="/transformation/upload-section" element={<UploadSectionPage />} />
                                <Route path="/transformation/source-files" element={<SourceFilesPage />} />
                                <Route path="/transformation/canvas-list" element={<CanvasListPage />} />
                                <Route path="/transformation/create-package" element={<CreatePackagePage />} />
                                <Route path="/transformation/package-list" element={<PackageListPage />} />
                                <Route path="/transformation/packages/:id/mapping" element={<PackageMappingPage />} />
                                <Route path="/transformation/packages/:id/edit" element={<CreatePackagePage />} />

                                {/* File Manager */}
                                <Route path="/transformation/file-manager" element={<FileManagerPage />} />
                                <Route path="/transformation/unprocessed-files" element={<UnprocessedFilesPage />} />

                                {/* Audit Panel */}
                                <Route path="/audit" element={<AuditPage />} />

                                {/* SWIFT Panel */}
                                <Route path="/swift" element={<SwiftPage />} />
                                <Route path="/swift/parameters" element={<SwiftParameterPage />} />
                                <Route path="/swift/packages" element={<SwiftPackagePage />} />
                            </Route>

                            {/* 404 Catch-all */}
                            <Route path="*" element={<ErrorPage errorCode={404} />} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </SnackbarProvider>
        </ThemeProvider>
    );
}

export default App;
