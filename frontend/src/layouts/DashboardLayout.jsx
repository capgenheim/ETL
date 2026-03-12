import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import {
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    CircularProgress,
    Tooltip,
    Chip,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

export default function DashboardLayout() {
    const { user, isAuthenticated, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false); // Collapsed by default

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    backgroundColor: palette.bgPrimary,
                }}
            >
                <CircularProgress sx={{ color: palette.accentPrimary }} />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const drawerWidth = sidebarOpen ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_COLLAPSED;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar open={sidebarOpen} />

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* App Bar */}
                <AppBar
                    position="sticky"
                    sx={{
                        width: '100%',
                        backgroundColor: alpha(palette.bgSecondary, 0.85),
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <Toolbar sx={{ minHeight: 64 }}>
                        {/* Hamburger Menu */}
                        <Tooltip title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
                            <IconButton
                                id="hamburger-menu"
                                edge="start"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                sx={{
                                    mr: 2,
                                    color: palette.textSecondary,
                                    '&:hover': {
                                        color: palette.accentPrimary,
                                        backgroundColor: alpha(palette.accentPrimary, 0.08),
                                    },
                                }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>

                        {/* Page Title */}
                        <Typography
                            variant="h6"
                            sx={{ flexGrow: 1, fontWeight: 600, fontSize: '1.1rem' }}
                        >
                            Dashboard
                        </Typography>

                        {/* Status Indicator */}
                        <Chip
                            label="LIVE"
                            size="small"
                            sx={{
                                mr: 2,
                                fontFamily: '"Roboto Mono", monospace',
                                fontWeight: 600,
                                fontSize: '0.65rem',
                                letterSpacing: '0.08em',
                                backgroundColor: alpha(palette.success, 0.12),
                                color: palette.success,
                                border: `1px solid ${alpha(palette.success, 0.3)}`,
                                height: 24,
                                '& .MuiChip-label': { px: 1 },
                            }}
                        />

                        {/* Notifications */}
                        <Tooltip title="Notifications">
                            <IconButton
                                sx={{
                                    color: palette.textSecondary,
                                    '&:hover': {
                                        color: palette.accentPrimary,
                                        backgroundColor: alpha(palette.accentPrimary, 0.08),
                                    },
                                }}
                            >
                                <NotificationsIcon />
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </AppBar>

                {/* Page Content */}
                <Box
                    sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        maxWidth: 1400,
                        mx: 'auto',
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
