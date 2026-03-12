import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Divider,
    Typography,
    Avatar,
    Stack,
    Fade,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Logout as LogoutIcon,
    DataObject as DataObjectIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

const navItems = [
    { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
];

export default function Sidebar({ open }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const drawerWidth = open ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_COLLAPSED;

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: palette.bgSecondary,
                    borderRight: `1px solid ${palette.border}`,
                },
            }}
        >
            {/* Brand */}
            <Box
                sx={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    px: open ? 2.5 : 0,
                    justifyContent: open ? 'flex-start' : 'center',
                    borderBottom: `1px solid ${palette.border}`,
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${palette.accentPrimary} 0%, ${palette.accentSecondary} 100%)`,
                        flexShrink: 0,
                    }}
                >
                    <DataObjectIcon sx={{ fontSize: 22, color: '#000' }} />
                </Box>
                {open && (
                    <Fade in={open} timeout={200}>
                        <Typography
                            variant="h6"
                            sx={{
                                ml: 1.5,
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                background: `linear-gradient(135deg, ${palette.textPrimary} 0%, ${palette.accentPrimary} 100%)`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            ETL Platform
                        </Typography>
                    </Fade>
                )}
            </Box>

            {/* Navigation Items */}
            <Box sx={{ flex: 1, py: 1 }}>
                <List disablePadding>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Tooltip
                                key={item.text}
                                title={!open ? item.text : ''}
                                placement="right"
                                arrow
                            >
                                <ListItemButton
                                    selected={isActive}
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        minHeight: 44,
                                        px: open ? 2.5 : 0,
                                        justifyContent: open ? 'initial' : 'center',
                                        my: 0.3,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 2 : 0,
                                            justifyContent: 'center',
                                            color: isActive ? palette.accentPrimary : 'text.secondary',
                                            transition: 'color 0.2s',
                                        }}
                                    >
                                        <item.icon sx={{ fontSize: 22 }} />
                                    </ListItemIcon>
                                    {open && (
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{
                                                fontSize: '0.875rem',
                                                fontWeight: isActive ? 600 : 400,
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </Tooltip>
                        );
                    })}
                </List>
            </Box>

            {/* Bottom Section */}
            <Box>

                <Divider sx={{ borderColor: palette.border }} />

                {/* User Profile */}
                <Box sx={{ p: open ? 2 : 1, display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center' }}>
                    <Avatar
                        sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: alpha(palette.accentPrimary, 0.2),
                            color: palette.accentPrimary,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    {open && (
                        <Fade in={open} timeout={200}>
                            <Box sx={{ ml: 1.5, overflow: 'hidden', flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {user?.first_name
                                        ? `${user.first_name} ${user.last_name || ''}`
                                        : user?.email || 'User'}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        display: 'block',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {user?.email || ''}
                                </Typography>
                            </Box>
                        </Fade>
                    )}
                </Box>

                {/* Logout */}
                <Tooltip title={!open ? 'Sign Out' : ''} placement="right" arrow>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            minHeight: 44,
                            px: open ? 2.5 : 0,
                            justifyContent: open ? 'initial' : 'center',
                            mb: 1,
                            mx: 1,
                            borderRadius: 1,
                            color: palette.error,
                            '&:hover': {
                                backgroundColor: alpha(palette.error, 0.08),
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: open ? 2 : 0,
                                justifyContent: 'center',
                                color: palette.error,
                            }}
                        >
                            <LogoutIcon sx={{ fontSize: 22 }} />
                        </ListItemIcon>
                        {open && (
                            <ListItemText
                                primary="Sign Out"
                                primaryTypographyProps={{
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: palette.error,
                                }}
                            />
                        )}
                    </ListItemButton>
                </Tooltip>
            </Box>
        </Drawer>
    );
}
