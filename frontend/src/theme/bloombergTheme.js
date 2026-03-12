import { createTheme, alpha } from '@mui/material/styles';

// Bloomberg Terminal-inspired dark color palette
const palette = {
    // Backgrounds
    bgPrimary: '#0a0e17',      // Deep navy-black
    bgSecondary: '#111827',     // Dark charcoal
    bgSurface: '#1a2035',       // Card/surface background
    bgElevated: '#1e2a42',      // Elevated surfaces
    bgHover: '#243352',         // Hover state

    // Accents
    accentPrimary: '#ff9800',   // Bloomberg orange
    accentSecondary: '#f57c00', // Darker orange
    accentTertiary: '#ffb74d',  // Light orange

    // Status
    success: '#00e676',         // Green
    error: '#ff5252',           // Red
    warning: '#ffd740',         // Amber
    info: '#40c4ff',            // Blue

    // Text
    textPrimary: '#e8eaed',     // Off-white
    textSecondary: '#9aa0a6',   // Muted gray
    textDisabled: '#5f6368',    // Dim gray

    // Borders
    border: '#2d3748',          // Subtle border
    borderLight: '#3d4a5c',     // Lighter border
    divider: '#1e293b',         // Divider line
};

const bloombergTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: palette.accentPrimary,
            light: palette.accentTertiary,
            dark: palette.accentSecondary,
            contrastText: '#000000',
        },
        secondary: {
            main: palette.info,
            light: '#80d8ff',
            dark: '#0091ea',
        },
        background: {
            default: palette.bgPrimary,
            paper: palette.bgSecondary,
        },
        text: {
            primary: palette.textPrimary,
            secondary: palette.textSecondary,
            disabled: palette.textDisabled,
        },
        error: { main: palette.error },
        warning: { main: palette.warning },
        success: { main: palette.success },
        info: { main: palette.info },
        divider: palette.divider,
        action: {
            hover: alpha(palette.accentPrimary, 0.08),
            selected: alpha(palette.accentPrimary, 0.16),
            focus: alpha(palette.accentPrimary, 0.12),
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
        fontWeightLight: 300,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
        },
        body1: {
            fontSize: '0.938rem',
            lineHeight: 1.6,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        caption: {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.03em',
        },
        overline: {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '0.688rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
        },
        button: {
            fontWeight: 600,
            letterSpacing: '0.02em',
            textTransform: 'none',
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        `0 1px 3px ${alpha('#000', 0.3)}`,
        `0 2px 6px ${alpha('#000', 0.35)}`,
        `0 4px 12px ${alpha('#000', 0.4)}`,
        `0 6px 16px ${alpha('#000', 0.4)}`,
        `0 8px 24px ${alpha('#000', 0.45)}`,
        `0 12px 32px ${alpha('#000', 0.45)}`,
        `0 16px 48px ${alpha('#000', 0.5)}`,
        ...Array(17).fill(`0 16px 48px ${alpha('#000', 0.5)}`),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: `${palette.borderLight} ${palette.bgPrimary}`,
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: palette.bgPrimary,
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: palette.borderLight,
                        borderRadius: '4px',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 24px',
                    fontSize: '0.938rem',
                    transition: 'all 0.2s ease-in-out',
                },
                contained: {
                    boxShadow: `0 2px 8px ${alpha(palette.accentPrimary, 0.3)}`,
                    '&:hover': {
                        boxShadow: `0 4px 16px ${alpha(palette.accentPrimary, 0.4)}`,
                        transform: 'translateY(-1px)',
                    },
                },
                outlined: {
                    borderColor: palette.border,
                    '&:hover': {
                        borderColor: palette.accentPrimary,
                        backgroundColor: alpha(palette.accentPrimary, 0.04),
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        backgroundColor: alpha(palette.bgSurface, 0.6),
                        transition: 'all 0.2s ease-in-out',
                        '& fieldset': {
                            borderColor: palette.border,
                            transition: 'border-color 0.2s ease-in-out',
                        },
                        '&:hover fieldset': {
                            borderColor: palette.borderLight,
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: palette.accentPrimary,
                            borderWidth: '2px',
                        },
                        '&.Mui-focused': {
                            backgroundColor: alpha(palette.bgSurface, 0.8),
                        },
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    backgroundColor: palette.bgSurface,
                    border: `1px solid ${palette.border}`,
                    backgroundImage: 'none',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                        borderColor: alpha(palette.accentPrimary, 0.3),
                        boxShadow: `0 4px 20px ${alpha('#000', 0.3)}`,
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: palette.bgSecondary,
                    borderRight: `1px solid ${palette.border}`,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha(palette.bgSecondary, 0.85),
                    backdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${palette.border}`,
                    boxShadow: 'none',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '2px 8px',
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                        backgroundColor: alpha(palette.accentPrimary, 0.12),
                        '&:hover': {
                            backgroundColor: alpha(palette.accentPrimary, 0.18),
                        },
                        '& .MuiListItemIcon-root': {
                            color: palette.accentPrimary,
                        },
                        '& .MuiListItemText-primary': {
                            color: palette.accentPrimary,
                            fontWeight: 600,
                        },
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: palette.bgElevated,
                    border: `1px solid ${palette.border}`,
                    fontSize: '0.813rem',
                    borderRadius: 8,
                },
            },
        },
    },
});

// Export palette for reuse in custom components
export { palette };
export default bloombergTheme;
