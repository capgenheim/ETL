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
    Collapse,
    Fade,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Transform as TransformIcon,
    UploadFile as UploadFileIcon,
    CloudUpload as CloudUploadIcon,
    Description as SourceIcon,
    GridView as CanvasIcon,
    AddBox as AddBoxIcon,
    ListAlt as ListAltIcon,
    Policy as AuditIcon,
    ExpandLess,
    ExpandMore,
    Logout as LogoutIcon,
    DataObject as DataObjectIcon,
    FolderOpen as FolderOpenIcon,
    Inbox as InboxIcon,
    Language as SwiftIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

// Navigation structure — `roles` restricts visibility (omit for all roles)
const navItems = [
    { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
    {
        text: 'Transformation',
        icon: TransformIcon,
        roles: ['user'],
        children: [
            {
                text: 'File Upload',
                icon: UploadFileIcon,
                children: [
                    { text: 'Upload Section', icon: CloudUploadIcon, path: '/transformation/upload-section' },
                    { text: 'List of Source Files', icon: SourceIcon, path: '/transformation/source-files' },
                    { text: 'List of Canvas', icon: CanvasIcon, path: '/transformation/canvas-list' },
                ],
            },
            { text: 'Create Package', icon: AddBoxIcon, path: '/transformation/create-package' },
            { text: 'Package List', icon: ListAltIcon, path: '/transformation/package-list' },
        ],
    },
    {
        text: 'SWIFT',
        icon: SwiftIcon,
        roles: ['user'],
        children: [
            { text: 'SWIFT Messages', icon: SwiftIcon, path: '/swift' },
            { text: 'SWIFT Packages', icon: AddBoxIcon, path: '/swift/packages' },
            { text: 'SWIFT Parameters', icon: ListAltIcon, path: '/swift/parameters' },
        ],
    },
    {
        text: 'File Manager',
        icon: FolderOpenIcon,
        roles: ['user'],
        children: [
            { text: 'Source Files', icon: FolderOpenIcon, path: '/transformation/file-manager' },
            { text: 'Unprocessed Files', icon: InboxIcon, path: '/transformation/unprocessed-files' },
        ],
    },
    { text: 'Audit', icon: AuditIcon, path: '/audit', roles: ['user'] },
];

export default function Sidebar({ open }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState({});

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const toggleMenu = (text) => {
        setExpandedMenus((prev) => ({ ...prev, [text]: !prev[text] }));
    };

    // Check if a parent group has an active child (recursive)
    const isGroupActive = (children) =>
        children?.some((child) =>
            child.path
                ? location.pathname === child.path
                : isGroupActive(child.children)
        );

    // Filter nav items based on user role
    const visibleNavItems = navItems.filter(
        (item) => !item.roles || item.roles.includes(user?.role)
    );

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
                    {visibleNavItems.map((item) => {
                        // Item with children (expandable group)
                        if (item.children) {
                            const groupActive = isGroupActive(item.children);
                            const isExpanded = expandedMenus[item.text] ?? groupActive;

                            return (
                                <Box key={item.text}>
                                    <Tooltip
                                        title={!open ? item.text : ''}
                                        placement="right"
                                        arrow
                                    >
                                        <ListItemButton
                                            onClick={() => {
                                                if (open) {
                                                    toggleMenu(item.text);
                                                } else {
                                                    // When collapsed, navigate to first child
                                                    navigate(item.children[0].path);
                                                }
                                            }}
                                            sx={{
                                                minHeight: 44,
                                                px: open ? 2.5 : 0,
                                                justifyContent: open ? 'initial' : 'center',
                                                my: 0.3,
                                                ...(groupActive && !open && {
                                                    backgroundColor: alpha(palette.accentPrimary, 0.08),
                                                }),
                                            }}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: 0,
                                                    mr: open ? 2 : 0,
                                                    justifyContent: 'center',
                                                    color: groupActive ? palette.accentPrimary : 'text.secondary',
                                                    transition: 'color 0.2s',
                                                }}
                                            >
                                                <item.icon sx={{ fontSize: 22 }} />
                                            </ListItemIcon>
                                            {open && (
                                                <>
                                                    <ListItemText
                                                        primary={item.text}
                                                        primaryTypographyProps={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: groupActive ? 600 : 400,
                                                        }}
                                                    />
                                                    {isExpanded ? (
                                                        <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    ) : (
                                                        <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    )}
                                                </>
                                            )}
                                        </ListItemButton>
                                    </Tooltip>

                                    {/* Sub-items */}
                                    {open && (
                                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                            <List disablePadding>
                                                {item.children.map((child) => {
                                                    // Nested sub-group (e.g. File Upload > Source Files, Canvas)
                                                    if (child.children) {
                                                        const subGroupActive = isGroupActive(child.children);
                                                        const isSubExpanded = expandedMenus[child.text] ?? subGroupActive;
                                                        return (
                                                            <Box key={child.text}>
                                                                <ListItemButton
                                                                    onClick={() => toggleMenu(child.text)}
                                                                    sx={{
                                                                        minHeight: 38,
                                                                        pl: 5.5,
                                                                        pr: 2.5,
                                                                        my: 0.15,
                                                                        ml: 2.5,
                                                                    }}
                                                                >
                                                                    <ListItemIcon
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            mr: 1.5,
                                                                            justifyContent: 'center',
                                                                            color: subGroupActive ? palette.accentPrimary : 'text.secondary',
                                                                        }}
                                                                    >
                                                                        <child.icon sx={{ fontSize: 18 }} />
                                                                    </ListItemIcon>
                                                                    <ListItemText
                                                                        primary={child.text}
                                                                        primaryTypographyProps={{
                                                                            fontSize: '0.8125rem',
                                                                            fontWeight: subGroupActive ? 600 : 400,
                                                                        }}
                                                                    />
                                                                    {isSubExpanded ? (
                                                                        <ExpandLess sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                    ) : (
                                                                        <ExpandMore sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                    )}
                                                                </ListItemButton>
                                                                <Collapse in={isSubExpanded} timeout="auto" unmountOnExit>
                                                                    <List disablePadding>
                                                                        {child.children.map((subChild) => {
                                                                            const isSubChildActive = location.pathname === subChild.path;
                                                                            return (
                                                                                <ListItemButton
                                                                                    key={subChild.text}
                                                                                    selected={isSubChildActive}
                                                                                    onClick={() => navigate(subChild.path)}
                                                                                    sx={{
                                                                                        minHeight: 34,
                                                                                        pl: 8,
                                                                                        pr: 2.5,
                                                                                        my: 0.1,
                                                                                        borderLeft: isSubChildActive
                                                                                            ? `2px solid ${palette.accentPrimary}`
                                                                                            : '2px solid transparent',
                                                                                        ml: 3.5,
                                                                                    }}
                                                                                >
                                                                                    <ListItemIcon
                                                                                        sx={{
                                                                                            minWidth: 0,
                                                                                            mr: 1.5,
                                                                                            justifyContent: 'center',
                                                                                            color: isSubChildActive ? palette.accentPrimary : 'text.secondary',
                                                                                        }}
                                                                                    >
                                                                                        <subChild.icon sx={{ fontSize: 16 }} />
                                                                                    </ListItemIcon>
                                                                                    <ListItemText
                                                                                        primary={subChild.text}
                                                                                        primaryTypographyProps={{
                                                                                            fontSize: '0.75rem',
                                                                                            fontWeight: isSubChildActive ? 600 : 400,
                                                                                        }}
                                                                                    />
                                                                                </ListItemButton>
                                                                            );
                                                                        })}
                                                                    </List>
                                                                </Collapse>
                                                            </Box>
                                                        );
                                                    }

                                                    // Simple child item
                                                    const isChildActive = location.pathname === child.path;
                                                    return (
                                                        <ListItemButton
                                                            key={child.text}
                                                            selected={isChildActive}
                                                            onClick={() => navigate(child.path)}
                                                            sx={{
                                                                minHeight: 38,
                                                                pl: 5.5,
                                                                pr: 2.5,
                                                                my: 0.15,
                                                                borderLeft: isChildActive
                                                                    ? `2px solid ${palette.accentPrimary}`
                                                                    : '2px solid transparent',
                                                                ml: 2.5,
                                                            }}
                                                        >
                                                            <ListItemIcon
                                                                sx={{
                                                                    minWidth: 0,
                                                                    mr: 1.5,
                                                                    justifyContent: 'center',
                                                                    color: isChildActive ? palette.accentPrimary : 'text.secondary',
                                                                }}
                                                            >
                                                                <child.icon sx={{ fontSize: 18 }} />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={child.text}
                                                                primaryTypographyProps={{
                                                                    fontSize: '0.8125rem',
                                                                    fontWeight: isChildActive ? 600 : 400,
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    );
                                                })}
                                            </List>
                                        </Collapse>
                                    )}
                                </Box>
                            );
                        }

                        // Simple nav item
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
