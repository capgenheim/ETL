import { Box, Typography, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { palette } from '../theme/bloombergTheme';
import { alpha } from '@mui/material/styles';

const ERROR_CONFIG = {
    404: {
        code: '404',
        title: 'Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist or has been moved.',
        icon: '🔍',
        accent: palette.warning || '#ff9800',
    },
    500: {
        code: '500',
        title: 'Internal Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        icon: '⚡',
        accent: palette.error || '#f44336',
    },
    502: {
        code: '502',
        title: 'Bad Gateway',
        message: 'The server is temporarily unavailable. It may be restarting.',
        icon: '🔌',
        accent: palette.error || '#f44336',
    },
    503: {
        code: '503',
        title: 'Service Unavailable',
        message: 'The platform is under maintenance. Please check back shortly.',
        icon: '🛠️',
        accent: palette.warning || '#ff9800',
    },
};

export default function ErrorPage({ errorCode = 404 }) {
    const navigate = useNavigate();
    const location = useLocation();
    const config = ERROR_CONFIG[errorCode] || ERROR_CONFIG[404];
    const accent = config.accent;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0a0e17',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background grid effect */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(255,152,0,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,152,0,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    zIndex: 0,
                }}
            />

            {/* Floating glow */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(accent, 0.08)} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                    zIndex: 0,
                }}
            />

            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    maxWidth: 520,
                    px: 3,
                }}
            >
                {/* Large error code with glitch effect */}
                <Typography
                    sx={{
                        fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
                        fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
                        fontWeight: 900,
                        lineHeight: 1,
                        color: 'transparent',
                        WebkitTextStroke: `2px ${alpha(accent, 0.5)}`,
                        textShadow: `0 0 80px ${alpha(accent, 0.15)}`,
                        mb: 1,
                        userSelect: 'none',
                        letterSpacing: '-0.04em',
                        position: 'relative',
                        '&::after': {
                            content: `"${config.code}"`,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            WebkitTextStroke: `2px ${alpha(accent, 0.15)}`,
                            textShadow: `4px 0 ${alpha(accent, 0.1)}`,
                            animation: 'glitch 3s infinite',
                        },
                        '@keyframes glitch': {
                            '0%, 100%': { clipPath: 'inset(0 0 0 0)' },
                            '20%': { clipPath: 'inset(20% 0 60% 0)', transform: 'translateX(2px)' },
                            '40%': { clipPath: 'inset(60% 0 10% 0)', transform: 'translateX(-2px)' },
                            '60%': { clipPath: 'inset(40% 0 30% 0)', transform: 'translateX(1px)' },
                        },
                    }}
                >
                    {config.code}
                </Typography>

                {/* Icon */}
                <Typography sx={{ fontSize: '2.5rem', mb: 2 }}>
                    {config.icon}
                </Typography>

                {/* Title */}
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        color: accent,
                        mb: 1.5,
                        fontSize: { xs: '1.3rem', sm: '1.6rem' },
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    }}
                >
                    {config.title}
                </Typography>

                {/* Message */}
                <Typography
                    sx={{
                        color: '#8b949e',
                        fontSize: '0.9rem',
                        lineHeight: 1.7,
                        mb: 1,
                    }}
                >
                    {config.message}
                </Typography>

                {/* Path info */}
                <Typography
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: alpha('#8b949e', 0.5),
                        fontSize: '0.7rem',
                        mb: 4,
                    }}
                >
                    {location.pathname}
                </Typography>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            backgroundColor: accent,
                            color: '#000',
                            fontWeight: 700,
                            px: 4,
                            py: 1.2,
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            borderRadius: '8px',
                            '&:hover': {
                                backgroundColor: alpha(accent, 0.85),
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 25px ${alpha(accent, 0.3)}`,
                            },
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Go to Dashboard
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(-1)}
                        sx={{
                            borderColor: alpha(accent, 0.3),
                            color: accent,
                            fontWeight: 600,
                            px: 3,
                            py: 1.2,
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            borderRadius: '8px',
                            '&:hover': {
                                borderColor: accent,
                                backgroundColor: alpha(accent, 0.08),
                            },
                        }}
                    >
                        Go Back
                    </Button>
                </Box>

                {/* Terminal-style status bar */}
                <Box
                    sx={{
                        mt: 5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2.5,
                        py: 0.8,
                        borderRadius: '20px',
                        border: `1px solid ${alpha(accent, 0.15)}`,
                        backgroundColor: alpha('#0d1117', 0.8),
                    }}
                >
                    <Box
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: accent,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.3 },
                            },
                        }}
                    />
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.62rem',
                            color: '#8b949e',
                            letterSpacing: '0.06em',
                        }}
                    >
                        ETL PLATFORM • STATUS {config.code}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
