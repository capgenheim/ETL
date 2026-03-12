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

/* ─── Action Buttons ──────────────────────────────────────────── */
function ActionButtons({ pkg, onAction, onEdit, onMap }) {
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
        </Box>
    );
}

/* ─── Package Row ─────────────────────────────────────────────── */
function PackageRow({ pkg, index, onAction, onEdit, onMap }) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '40px 1.5fr 1fr 0.8fr 0.8fr 0.6fr 0.7fr 1fr 200px',
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
            <ActionButtons pkg={pkg} onAction={onAction} onEdit={onEdit} onMap={onMap} />
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
                        gridTemplateColumns: '40px 1.5fr 1fr 0.8fr 0.8fr 0.6fr 0.7fr 1fr 200px',
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
                            onEdit={(id) => navigate(`/transformation/packages/${id}/edit`)}
                            onMap={(id) => navigate(`/transformation/packages/${id}/mapping`)}
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
