import { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Skeleton,
    Stack,
} from '@mui/material';
import {
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Speed as SpeedIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';
import api from '../services/api';

function StatCard({ title, value, icon: Icon, color, loading }) {
    return (
        <Card
            sx={{
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.3)})`,
                },
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography
                            variant="overline"
                            sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}
                        >
                            {title}
                        </Typography>
                        {loading ? (
                            <Skeleton width={60} height={40} />
                        ) : (
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: '"Roboto Mono", monospace',
                                    fontWeight: 700,
                                    color,
                                }}
                            >
                                {value}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(color, 0.12),
                        }}
                    >
                        <Icon sx={{ fontSize: 28, color }} />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/dashboard/summary/');
                setData(response.data);
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const stats = [
        {
            title: 'Total Users',
            value: data?.stats?.total_users ?? '-',
            icon: PeopleIcon,
            color: palette.accentPrimary,
        },
        {
            title: 'Active Users',
            value: data?.stats?.active_users ?? '-',
            icon: CheckCircleIcon,
            color: palette.success,
        },
        {
            title: 'System Status',
            value: data?.stats?.system_status === 'operational' ? 'OK' : 'ERR',
            icon: SpeedIcon,
            color: data?.stats?.system_status === 'operational' ? palette.success : palette.error,
        },
        {
            title: 'Server Time',
            value: data?.stats?.server_time
                ? new Date(data.stats.server_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : '-',
            icon: ScheduleIcon,
            color: palette.info,
        },
    ];

    return (
        <Box>
            {/* Welcome Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {loading ? <Skeleton width={300} /> : data?.welcome_message || 'Welcome!'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        Role:
                    </Typography>
                    {loading ? (
                        <Skeleton width={80} height={24} />
                    ) : (
                        <Chip
                            label={data?.user?.role?.toUpperCase() || 'USER'}
                            size="small"
                            sx={{
                                fontFamily: '"Roboto Mono", monospace',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                letterSpacing: '0.05em',
                                backgroundColor: alpha(palette.accentPrimary, 0.15),
                                color: palette.accentPrimary,
                                border: `1px solid ${alpha(palette.accentPrimary, 0.3)}`,
                            }}
                        />
                    )}
                </Stack>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat) => (
                    <Grid item xs={12} sm={6} md={3} key={stat.title}>
                        <StatCard {...stat} loading={loading} />
                    </Grid>
                ))}
            </Grid>

            {/* Activity Section Placeholder */}
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Recent Activity
                    </Typography>
                    <Box
                        sx={{
                            textAlign: 'center',
                            py: 6,
                            color: 'text.secondary',
                        }}
                    >
                        <SpeedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                        <Typography variant="body2">No recent activity to display.</Typography>
                        <Typography variant="caption" color="text.disabled">
                            Activity will appear here as you use the platform.
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
