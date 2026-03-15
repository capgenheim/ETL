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
    Inventory2 as PackagesIcon,
    PlayCircleOutline as ActiveIcon,
    Speed as SpeedIcon,
    Schedule as ScheduleIcon,
    CheckCircle as SuccessIcon,
    Error as FailIcon,
    Inbox as InboxIcon,
    DataUsage as RowsIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';
import api from '../services/api';

function StatCard({ title, value, subtitle, icon: Icon, color, loading }) {
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
                        {subtitle && !loading && (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                            >
                                {subtitle}
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

function ActivityRow({ item }) {
    const isSuccess = item.status === 'success';
    const statusColor = isSuccess ? palette.success : palette.error;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
                px: 1.5,
                borderBottom: `1px solid ${palette.border}`,
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.03) },
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: statusColor,
                    flexShrink: 0,
                }}
            />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {item.action}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {item.detail} · {item.package}
                </Typography>
            </Box>
            <Typography
                variant="caption"
                sx={{ fontFamily: '"Roboto Mono", monospace', color: 'text.secondary', flexShrink: 0 }}
            >
                {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
            </Typography>
        </Box>
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

    const s = data?.stats || {};

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const stats = [
        {
            title: 'Total Packages',
            value: s.total_packages ?? '-',
            subtitle: `${s.active_packages ?? 0} active`,
            icon: PackagesIcon,
            color: palette.accentPrimary,
        },
        {
            title: 'Successful Runs (7d)',
            value: s.successful_runs_7d ?? '-',
            subtitle: `of ${s.total_runs_7d ?? 0} total runs`,
            icon: SuccessIcon,
            color: palette.success,
        },
        {
            title: 'Failed Runs (7d)',
            value: s.failed_runs_7d ?? '-',
            icon: FailIcon,
            color: palette.error,
        },
        {
            title: 'Rows Processed (7d)',
            value: s.total_rows_processed_7d?.toLocaleString() ?? '-',
            icon: RowsIcon,
            color: palette.info,
        },
        {
            title: 'Unprocessed Files',
            value: s.unprocessed_files ?? '-',
            subtitle: s.unprocessed_size ? formatSize(s.unprocessed_size) : undefined,
            icon: InboxIcon,
            color: s.unprocessed_files > 0 ? palette.warning : palette.textDisabled,
        },
        {
            title: 'Server Time',
            value: s.server_time
                ? new Date(s.server_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : '-',
            subtitle: s.server_time
                ? new Date(s.server_time).toLocaleDateString()
                : undefined,
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
                    <Grid item xs={12} sm={6} md={4} lg={2} key={stat.title}>
                        <StatCard {...stat} loading={loading} />
                    </Grid>
                ))}
            </Grid>

            {/* Activity Section */}
            <Card>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Recent Activity
                    </Typography>
                    {loading ? (
                        <Box sx={{ py: 3 }}>
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} height={40} sx={{ mb: 1 }} />
                            ))}
                        </Box>
                    ) : data?.recent_activity?.length > 0 ? (
                        <Box>
                            {data.recent_activity.map((item) => (
                                <ActivityRow key={item.id} item={item} />
                            ))}
                        </Box>
                    ) : (
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
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
