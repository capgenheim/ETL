import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    TextField,
    IconButton,
    Chip,
    Tooltip,
    Snackbar,
    Alert,
    Fade,
    TablePagination,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemText,
    Badge,
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Stop as StopIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    AddBox as AddIcon,
    Pattern as PatternIcon,
    SwapHoriz as MapIcon,
    RocketLaunch as AdhocIcon,
    Close as CloseIcon,
    CheckCircle as SuccessIcon,
    Error as FailIcon,
    Assignment as AuditLogIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

const ROWS_PER_PAGE = 20;

/* ─── Status Chip Configs ─────────────────────────────────────── */
const STATUS_CONFIG = {
    active: { label: 'Active', color: palette.success, pulse: false },
    inactive: { label: 'Inactive', color: palette.textDisabled, pulse: false },
    running: { label: 'Running', color: palette.info, pulse: true },
    paused: { label: 'Paused', color: palette.warning, pulse: false },
};

const MAPPING_CONFIG = {
    mapped: { label: 'Mapped', color: palette.success },
    unmapped: { label: 'Unmapped', color: palette.warning },
};

/* ─── Status Chip ─────────────────────────────────────────────── */
function StatusChip({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
    return (
        <Chip
            label={cfg.label}
            size="small"
            sx={{
                height: 22,
                fontSize: '0.65rem',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: alpha(cfg.color, 0.12),
                color: cfg.color,
                border: `1px solid ${alpha(cfg.color, 0.3)}`,
                '& .MuiChip-label': { px: 1 },
                ...(cfg.pulse && {
                    animation: 'pulse-glow 2s ease-in-out infinite',
                    '@keyframes pulse-glow': {
                        '0%, 100%': { boxShadow: `0 0 4px ${alpha(cfg.color, 0.3)}` },
                        '50%': { boxShadow: `0 0 12px ${alpha(cfg.color, 0.6)}` },
                    },
                }),
            }}
        />
    );
}

/* ─── Mapping Chip ────────────────────────────────────────────── */
function MappingChip({ mappingStatus }) {
    const cfg = MAPPING_CONFIG[mappingStatus] || MAPPING_CONFIG.unmapped;
    return (
        <Chip
            icon={<MapIcon sx={{ fontSize: 14 }} />}
            label={cfg.label}
            size="small"
            sx={{
                height: 22,
                fontSize: '0.65rem',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                backgroundColor: alpha(cfg.color, 0.12),
                color: cfg.color,
                border: `1px solid ${alpha(cfg.color, 0.3)}`,
                '& .MuiChip-label': { px: 0.75 },
                '& .MuiChip-icon': { color: cfg.color },
            }}
        />
    );
}

/* ─── Run Log Badge (Circle) ──────────────────────────────────── */
function RunLogBadge({ summary, onOpenLogs }) {
    const total = summary?.total || 0;
    const success = summary?.success || 0;
    const failed = summary?.failed || 0;

    if (total === 0) {
        return (
            <Tooltip title="No runs yet">
                <Box
                    sx={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: alpha(palette.textDisabled, 0.08),
                        border: `2px solid ${alpha(palette.textDisabled, 0.2)}`,
                        cursor: 'default',
                    }}
                >
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: palette.textDisabled }}>
                        0
                    </Typography>
                </Box>
            </Tooltip>
        );
    }

    const hasFailures = failed > 0;
    const allSuccess = failed === 0 && total > 0;
    const circleColor = hasFailures ? palette.error : palette.success;
    const runTypeLabel = {
        instant: '⚡ Instant',
        scheduled: '⏰ Scheduled',
        adhoc: '🚀 Ad-hoc',
    };

    return (
        <Tooltip
            title={
                <Box sx={{ fontSize: '0.7rem', lineHeight: 1.6 }}>
                    <Box>✅ Success: {success}</Box>
                    {failed > 0 && <Box>❌ Failed: {failed}</Box>}
                    <Box>Total: {total}</Box>
                    {summary?.last_run_type && (
                        <Box>Last: {runTypeLabel[summary.last_run_type] || summary.last_run_type}</Box>
                    )}
                </Box>
            }
        >
            <Badge
                badgeContent={failed > 0 ? failed : null}
                color="error"
                sx={{
                    cursor: 'pointer',
                    '& .MuiBadge-badge': {
                        fontSize: '0.55rem',
                        height: 14, minWidth: 14,
                        fontWeight: 700,
                    },
                }}
                onClick={() => onOpenLogs()}
            >
                <Box
                    onClick={() => onOpenLogs()}
                    sx={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: alpha(circleColor, 0.1),
                        border: `2px solid ${alpha(circleColor, 0.5)}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                            backgroundColor: alpha(circleColor, 0.2),
                            transform: 'scale(1.1)',
                        },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            fontFamily: '"JetBrains Mono", monospace',
                            color: circleColor,
                        }}
                    >
                        {total}
                    </Typography>
                </Box>
            </Badge>
        </Tooltip>
    );
}

/* ─── Run Logs Dialog ─────────────────────────────────────────── */
function RunLogsDialog({ open, onClose, packageName, packageId }) {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (open && packageId) {
            api.get(`/transformation/packages/${packageId}/run-logs/`)
                .then((res) => setLogs(res.data))
                .catch(() => { });
        }
    }, [open, packageId]);

    const runTypeConfig = {
        instant: { label: '⚡ Instant', color: palette.success },
        scheduled: { label: '⏰ Scheduled', color: palette.accentPrimary },
        adhoc: { label: '🚀 Ad-hoc', color: '#c586c0' },
    };

    const statusConfig = {
        success: { label: '✅ Success', color: palette.success },
        failed: { label: '❌ Failed', color: palette.error },
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: palette.bgPrimary,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                    backgroundImage: 'none',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: `1px solid ${palette.border}`, py: 1.5,
                }}
            >
                <Box>
                    <Typography sx={{ fontWeight: 700, color: palette.textPrimary, fontSize: '0.95rem' }}>
                        Run Logs — {packageName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace', mt: 0.25 }}>
                        {(() => {
                            const now = new Date();
                            const from = new Date(now);
                            from.setDate(from.getDate() - 7);
                            const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                            return `${fmt(from)} → ${fmt(now)} (7 days) • ${logs.length} record${logs.length !== 1 ? 's' : ''}`;
                        })()}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, maxHeight: 420 }}>
                {logs.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No runs in the last 7 days.</Typography>
                    </Box>
                ) : (
                    <List dense sx={{ p: 0 }}>
                        {logs.map((log) => {
                            const rtCfg = runTypeConfig[log.run_type] || runTypeConfig.instant;
                            const stCfg = statusConfig[log.status] || statusConfig.success;
                            return (
                                <ListItem
                                    key={log.id}
                                    sx={{
                                        borderBottom: `1px solid ${palette.border}`,
                                        py: 1, px: 2,
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    {/* Row 1: icon + filename + status chip + run type chip */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                        {log.status === 'success' ? (
                                            <SuccessIcon sx={{ fontSize: 20, color: palette.success, flexShrink: 0 }} />
                                        ) : (
                                            <FailIcon sx={{ fontSize: 20, color: palette.error, flexShrink: 0 }} />
                                        )}
                                        <Typography
                                            sx={{
                                                fontSize: '0.75rem',
                                                fontFamily: '"JetBrains Mono", monospace',
                                                fontWeight: 600,
                                                color: palette.textPrimary,
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {log.original_filename}
                                        </Typography>
                                        <Chip
                                            label={stCfg.label}
                                            size="small"
                                            sx={{
                                                height: 18, fontSize: '0.55rem',
                                                fontWeight: 700,
                                                backgroundColor: alpha(stCfg.color, 0.12),
                                                color: stCfg.color,
                                                border: `1px solid ${alpha(stCfg.color, 0.3)}`,
                                                '& .MuiChip-label': { px: 0.5 },
                                            }}
                                        />
                                        <Chip
                                            label={rtCfg.label}
                                            size="small"
                                            sx={{
                                                height: 18, fontSize: '0.55rem',
                                                fontWeight: 700,
                                                backgroundColor: alpha(rtCfg.color, 0.12),
                                                color: rtCfg.color,
                                                '& .MuiChip-label': { px: 0.5 },
                                            }}
                                        />
                                    </Box>
                                    {/* Row 2: output details */}
                                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5, pl: 3.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            → {log.output_filename || 'N/A'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {log.rows_processed} rows
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(log.processed_at).toLocaleString()}
                                        </Typography>
                                    </Box>
                                    {/* Row 3: error message if failed */}
                                    {log.status === 'failed' && log.error_message && (
                                        <Box sx={{ mt: 0.5, pl: 3.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{ color: palette.error, fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace' }}
                                            >
                                                Error: {log.error_message}
                                            </Typography>
                                        </Box>
                                    )}
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ─── Action Buttons ──────────────────────────────────────────── */
function ActionButtons({ pkg, onAction, onEdit, onMap, onAdhocRun, onOpenLogs }) {
    const btnSx = (color) => ({
        width: 30, height: 30,
        color: 'text.secondary',
        '&:hover': { color, backgroundColor: alpha(color, 0.1) },
        '&.Mui-disabled': { color: palette.textDisabled },
    });

    return (
        <Box sx={{ display: 'flex', gap: 0.25 }}>
            <Tooltip title="Start">
                <span>
                    <IconButton
                        size="small"
                        sx={btnSx(palette.success)}
                        disabled={pkg.status === 'active' || pkg.status === 'running' || pkg.mapping_status === 'unmapped'}
                        onClick={() => onAction(pkg.id, 'start')}
                    >
                        <PlayIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Pause">
                <span>
                    <IconButton
                        size="small"
                        sx={btnSx(palette.warning)}
                        disabled={pkg.status !== 'active' && pkg.status !== 'running'}
                        onClick={() => onAction(pkg.id, 'pause')}
                    >
                        <PauseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Stop">
                <span>
                    <IconButton
                        size="small"
                        sx={btnSx(palette.error)}
                        disabled={pkg.status === 'inactive'}
                        onClick={() => onAction(pkg.id, 'stop')}
                    >
                        <StopIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title={pkg.mapping_status === 'unmapped' ? 'Map Fields' : 'Edit Mapping'}>
                <IconButton
                    size="small"
                    sx={btnSx(palette.info)}
                    onClick={() => onMap(pkg.id)}
                >
                    <MapIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Edit Package">
                <IconButton
                    size="small"
                    sx={btnSx(palette.accentPrimary)}
                    onClick={() => onEdit(pkg.id)}
                >
                    <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Ad-hoc Run (Manual emergency trigger)">
                <span>
                    <IconButton
                        size="small"
                        sx={{
                            ...btnSx('#c586c0'),
                            '&:hover': {
                                color: '#c586c0',
                                backgroundColor: alpha('#c586c0', 0.1),
                            },
                        }}
                        disabled={pkg.mapping_status === 'unmapped'}
                        onClick={() => onAdhocRun(pkg.id, pkg.name)}
                    >
                        <AdhocIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Audit Log">
                <IconButton
                    size="small"
                    sx={{
                        ...btnSx('#4fc3f7'),
                        '&:hover': {
                            color: '#4fc3f7',
                            backgroundColor: alpha('#4fc3f7', 0.1),
                        },
                    }}
                    onClick={() => onOpenLogs(pkg.id, pkg.name)}
                >
                    <AuditLogIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
}

/* ─── Package Row ─────────────────────────────────────────────── */
function PackageRow({ pkg, index, onAction, onEdit, onMap, onAdhocRun, onOpenLogs }) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '40px 1.5fr 1fr 0.7fr 0.7fr 0.6fr 0.6fr 45px 0.9fr 260px',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${palette.border}`,
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.04) },
            }}
        >
            {/* # */}
            <Typography
                sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    textAlign: 'center',
                }}
            >
                {String(index).padStart(3, '0')}
            </Typography>

            {/* Package Name */}
            <Box>
                <Typography
                    sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: palette.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {pkg.name}
                </Typography>
            </Box>

            {/* Pattern */}
            <Chip
                icon={<PatternIcon sx={{ fontSize: 12 }} />}
                label={pkg.file_pattern}
                size="small"
                sx={{
                    height: 22,
                    fontSize: '0.65rem',
                    fontFamily: '"JetBrains Mono", monospace',
                    backgroundColor: alpha(palette.bgElevated, 0.6),
                    border: `1px solid ${palette.border}`,
                    '& .MuiChip-label': { px: 0.75 },
                    maxWidth: '100%',
                }}
            />

            {/* Input → Output */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                    label={pkg.input_format?.toUpperCase()}
                    size="small"
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                />
                <Typography variant="caption" color="text.secondary">→</Typography>
                <Chip
                    label={pkg.output_format?.toUpperCase()}
                    size="small"
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                />
            </Box>

            {/* Mode */}
            <Chip
                label={pkg.batch_mode === 'instant' ? '⚡ Instant' : `⏰ ${pkg.batch_interval_minutes}m`}
                size="small"
                sx={{
                    height: 22,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    fontFamily: '"JetBrains Mono", monospace',
                    backgroundColor: pkg.batch_mode === 'instant'
                        ? alpha(palette.success, 0.1)
                        : alpha(palette.accentPrimary, 0.1),
                    color: pkg.batch_mode === 'instant' ? palette.success : palette.accentPrimary,
                }}
            />

            {/* Status */}
            <StatusChip status={pkg.status} />

            {/* Mapping */}
            <MappingChip mappingStatus={pkg.mapping_status} />

            {/* Run Log Badge */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <RunLogBadge
                    summary={pkg.run_log_summary}
                    onOpenLogs={() => onOpenLogs(pkg.id, pkg.name)}
                />
            </Box>

            {/* Created By */}
            <Tooltip title={pkg.created_by_email || ''}>
                <Typography
                    sx={{
                        fontSize: '0.7rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {pkg.created_by_name || 'Unknown'}
                </Typography>
            </Tooltip>

            {/* Actions */}
            <ActionButtons
                pkg={pkg}
                onAction={onAction}
                onEdit={onEdit}
                onMap={onMap}
                onAdhocRun={onAdhocRun}
                onOpenLogs={onOpenLogs}
            />
        </Box>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function PackageListPage() {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [logsDialog, setLogsDialog] = useState({ open: false, packageId: null, packageName: '' });

    const fetchPackages = useCallback(async () => {
        try {
            const res = await api.get('/transformation/packages/');
            setPackages(res.data);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    // Reset page on search change
    useEffect(() => {
        setPage(0);
    }, [search]);

    const filtered = packages.filter((pkg) => {
        const q = search.toLowerCase();
        return (
            pkg.name.toLowerCase().includes(q) ||
            pkg.file_pattern.toLowerCase().includes(q) ||
            (pkg.created_by_name || '').toLowerCase().includes(q)
        );
    });

    const paginated = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

    const handleAction = async (id, action) => {
        try {
            await api.post(`/transformation/packages/${id}/${action}/`);
            fetchPackages();
            const labels = { start: 'started', pause: 'paused', stop: 'stopped' };
            setSnackbar({ open: true, message: `Package ${labels[action]}`, severity: 'success' });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.error || 'Action failed',
                severity: 'error',
            });
        }
    };

    const handleAdhocRun = async (id, name) => {
        try {
            const res = await api.post(`/transformation/packages/${id}/adhoc-run/`);
            const { matched, message } = res.data;
            if (matched > 0) {
                setSnackbar({
                    open: true,
                    message: `🚀 ${message}`,
                    severity: 'success',
                });
            } else {
                setSnackbar({
                    open: true,
                    message: message || 'No matching files found in inbound directory',
                    severity: 'warning',
                });
            }
            // Refresh after a delay to capture run logs
            setTimeout(fetchPackages, 2000);
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.error || 'Ad-hoc run failed',
                severity: 'error',
            });
        }
    };

    const handleOpenLogs = (packageId, packageName) => {
        setLogsDialog({ open: true, packageId, packageName });
    };

    const headerCellSx = {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: palette.accentPrimary,
        textTransform: 'uppercase',
    };

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        Package List
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Manage transformation packages — start, pause, stop, and configure field mappings
                    </Typography>
                </Box>
                <Box
                    onClick={() => navigate('/transformation/create-package')}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 2, py: 1,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        backgroundColor: palette.accentPrimary,
                        color: '#000',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        '&:hover': {
                            backgroundColor: alpha(palette.accentPrimary, 0.85),
                            boxShadow: `0 4px 16px ${alpha(palette.accentPrimary, 0.4)}`,
                        },
                    }}
                >
                    <AddIcon sx={{ fontSize: 18 }} />
                    New Package
                </Box>
            </Box>

            {/* Data Table */}
            <Paper
                elevation={0}
                sx={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    backgroundColor: alpha(palette.bgPrimary, 0.5),
                }}
            >
                {/* Search + Header */}
                <Box
                    sx={{
                        px: 2, py: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.4),
                    }}
                >
                    <TextField
                        size="small"
                        placeholder="Search packages..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: 280,
                            '& .MuiOutlinedInput-root': {
                                height: 36,
                                borderRadius: 1,
                                fontSize: '0.8rem',
                            },
                        }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
                        {filtered.length} package{filtered.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>

                {/* Column Headers */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1.5fr 1fr 0.7fr 0.7fr 0.6fr 0.6fr 45px 0.9fr 260px',
                        gap: 1.5,
                        px: 2,
                        py: 1,
                        borderBottom: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.3),
                    }}
                >
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>#</Typography>
                    <Typography sx={headerCellSx}>Package Name</Typography>
                    <Typography sx={headerCellSx}>Pattern</Typography>
                    <Typography sx={headerCellSx}>In → Out</Typography>
                    <Typography sx={headerCellSx}>Mode</Typography>
                    <Typography sx={headerCellSx}>Status</Typography>
                    <Typography sx={headerCellSx}>Mapping</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Runs</Typography>
                    <Typography sx={headerCellSx}>Created By</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'right', pr: 1 }}>Actions</Typography>
                </Box>

                {/* Rows */}
                {paginated.length > 0 ? (
                    paginated.map((pkg, idx) => (
                        <PackageRow
                            key={pkg.id}
                            pkg={pkg}
                            index={page * ROWS_PER_PAGE + idx + 1}
                            onAction={handleAction}
                            onEdit={(id) => {
                                const pkg = packages.find(p => p.id === id);
                                if (pkg && (pkg.status === 'active' || pkg.status === 'running')) {
                                    setSnackbar({ open: true, message: 'Stop the package before editing', severity: 'warning' });
                                    return;
                                }
                                navigate(`/transformation/packages/${id}/edit`);
                            }}
                            onMap={(id) => navigate(`/transformation/packages/${id}/mapping`)}
                            onAdhocRun={handleAdhocRun}
                            onOpenLogs={handleOpenLogs}
                        />
                    ))
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {packages.length === 0
                                ? 'No packages created yet. Click "New Package" to get started.'
                                : 'No packages match your search.'}
                        </Typography>
                    </Box>
                )}

                {/* Pagination Footer */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 0.5,
                        borderTop: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.3),
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.65rem',
                            color: palette.accentPrimary,
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                        }}
                    >
                        PACKAGES
                    </Typography>
                    <TablePagination
                        component="div"
                        count={filtered.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={ROWS_PER_PAGE}
                        rowsPerPageOptions={[]}
                        sx={{
                            '.MuiTablePagination-toolbar': { minHeight: 40 },
                            '.MuiTablePagination-displayedRows': {
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.7rem',
                            },
                        }}
                    />
                </Box>
            </Paper>

            {/* Run Logs Dialog */}
            <RunLogsDialog
                open={logsDialog.open}
                onClose={() => setLogsDialog({ open: false, packageId: null, packageName: '' })}
                packageName={logsDialog.packageName}
                packageId={logsDialog.packageId}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                TransitionComponent={Fade}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: 1.5, fontWeight: 500 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
