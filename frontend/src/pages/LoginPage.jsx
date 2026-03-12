import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Stack,
    Fade,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Email as EmailIcon,
    Lock as LockIcon,
    DataObject as DataObjectIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';

export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.non_field_errors) {
                setError(errorData.non_field_errors[0]);
            } else if (errorData?.detail) {
                setError(errorData.detail);
            } else if (errorData?.error) {
                setError(errorData.error);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `
          radial-gradient(ellipse at 20% 50%, ${alpha(palette.accentPrimary, 0.08)} 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, ${alpha(palette.info, 0.06)} 0%, transparent 50%),
          radial-gradient(ellipse at 50% 100%, ${alpha(palette.accentSecondary, 0.05)} 0%, transparent 50%),
          linear-gradient(180deg, ${palette.bgPrimary} 0%, ${alpha(palette.bgSecondary, 0.95)} 100%)
        `,
                p: 2,
            }}
        >
            <Fade in timeout={800}>
                <Card
                    sx={{
                        width: '100%',
                        maxWidth: 440,
                        border: `1px solid ${alpha(palette.accentPrimary, 0.15)}`,
                        backgroundColor: alpha(palette.bgSurface, 0.7),
                        backdropFilter: 'blur(24px)',
                        boxShadow: `0 8px 40px ${alpha('#000', 0.4)}, inset 0 1px 0 ${alpha(palette.accentPrimary, 0.1)}`,
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        {/* Logo / Brand */}
                        <Stack alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `linear-gradient(135deg, ${palette.accentPrimary} 0%, ${palette.accentSecondary} 100%)`,
                                    boxShadow: `0 4px 20px ${alpha(palette.accentPrimary, 0.4)}`,
                                }}
                            >
                                <DataObjectIcon sx={{ fontSize: 32, color: '#000' }} />
                            </Box>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    background: `linear-gradient(135deg, ${palette.textPrimary} 0%, ${palette.accentPrimary} 100%)`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                ETL Platform
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sign in to your account
                            </Typography>
                        </Stack>

                        {/* Error Alert */}
                        {error && (
                            <Fade in>
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 3,
                                        borderRadius: 2,
                                        backgroundColor: alpha(palette.error, 0.1),
                                        border: `1px solid ${alpha(palette.error, 0.3)}`,
                                    }}
                                    onClose={() => setError('')}
                                >
                                    {error}
                                </Alert>
                            </Fade>
                        )}

                        {/* Login Form */}
                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <TextField
                                id="email"
                                label="Email Address"
                                type="email"
                                fullWidth
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                autoFocus
                                sx={{ mb: 2.5 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                id="password"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                fullWidth
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                sx={{ mb: 3 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                size="small"
                                                sx={{ color: 'text.secondary' }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Button
                                id="login-button"
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading || !email || !password}
                                sx={{
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    background: `linear-gradient(135deg, ${palette.accentPrimary} 0%, ${palette.accentSecondary} 100%)`,
                                    color: '#000',
                                    '&:hover': {
                                        background: `linear-gradient(135deg, ${palette.accentTertiary} 0%, ${palette.accentPrimary} 100%)`,
                                    },
                                    '&.Mui-disabled': {
                                        background: alpha(palette.accentPrimary, 0.3),
                                        color: alpha('#000', 0.5),
                                    },
                                }}
                            >
                                {loading ? (
                                    <CircularProgress size={24} sx={{ color: '#000' }} />
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </Box>

                        {/* Footer */}
                        <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
                        >
                            ETL Platform v1.0 • Secure Access
                        </Typography>
                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
}
