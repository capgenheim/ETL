import { useState, useEffect, useCallback, useMemo } from 'react';
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
    Collapse,
} from '@mui/material';
import {
    Search as SearchIcon,
    Download as DownloadIcon,
    CheckCircle as SuccessIcon,
    Error as FailIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    KeyboardArrowDown as ExpandMoreIcon,
    KeyboardArrowRight as ChevronRightIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

/* ─── Status Filter ──────────────────────────────────────────────── */
function StatusFilterChips({ value, onChange }) {
    const filters = [
        { key: 'all', label: 'All' },
        { key: 'success', label: '✅ Success', color: palette.success },
        { key: 'failed', label: '❌ Failed', color: palette.error },
    ];
    return (
        <Box sx={{ display: 'flex', gap: 0.75 }}>
            {filters.map((f) => {
                const active = value === f.key;
                const chipColor = f.color || palette.textSecondary;
                return (
                    <Chip
                        key={f.key}
                        label={f.label}
                        size="small"
                        onClick={() => onChange(f.key)}
                        sx={{
                            height: 24,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", monospace',
                            cursor: 'pointer',
                            backgroundColor: active ? alpha(chipColor, 0.15) : 'transparent',
                            color: active ? chipColor : palette.textDisabled,
                            border: `1px solid ${active ? alpha(chipColor, 0.4) : palette.border}`,
                            '& .MuiChip-label': { px: 1 },
                            '&:hover': {
                                backgroundColor: alpha(chipColor, 0.1),
                            },
                        }}
                    />
                );
            })}
        </Box>
    );
}

/* ─── File Row ───────────────────────────────────────────────────── */
function FileRow({ file, index, onDownload }) {
    const isSuccess = file.status === 'success';
    const statusColor = isSuccess ? palette.success : palette.error;

    const runTypeConfig = {
        instant: { label: '⚡ Instant', color: palette.success },
        scheduled: { label: '⏰ Scheduled', color: palette.accentPrimary },
        adhoc: { label: '🚀 Ad-hoc', color: '#c586c0' },
    };
    const rtCfg = runTypeConfig[file.run_type] || runTypeConfig.instant;

    const formatSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 1.2fr 0.8fr 0.5fr 0.5fr 0.7fr 1.2fr 50px',
                alignItems: 'center',
                px: 0,
                py: 0,
                minHeight: 44,
                borderBottom: `1px solid ${palette.border}`,
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.04) },
                '& > *': {
                    px: 1,
                    py: 1,
                    borderRight: `1px solid ${alpha(palette.border, 0.5)}`,
                    '&:last-child': { borderRight: 'none' },
                    overflow: 'hidden',
                },
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

            {/* Original File + Tags */}
            <Box sx={{ overflow: 'hidden' }}>
                <Tooltip title={file.original_filename}>
                    <Typography
                        sx={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: palette.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: '"JetBrains Mono", monospace',
                            mb: 0.3,
                        }}
                    >
                        {file.original_filename}
                    </Typography>
                </Tooltip>
                {file.tags?.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                        {file.tags.map((tag) => (
                            <Chip
                                key={tag.id}
                                label={tag.name}
                                size="small"
                                sx={{
                                    height: 16,
                                    fontSize: '0.5rem',
                                    fontWeight: 700,
                                    backgroundColor: alpha(tag.color, 0.15),
                                    color: tag.color,
                                    border: `1px solid ${alpha(tag.color, 0.3)}`,
                                    '& .MuiChip-label': { px: 0.4 },
                                }}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* Output File */}
            <Tooltip title={file.output_filename || 'N/A'}>
                <Typography
                    sx={{
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: '"JetBrains Mono", monospace',
                    }}
                >
                    {file.output_filename || '—'}
                </Typography>
            </Tooltip>

            {/* Package */}
            <Typography
                sx={{
                    fontSize: '0.75rem',
                    color: palette.accentPrimary,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {file.package_name}
            </Typography>

            {/* Size */}
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}>
                {formatSize(file.file_size)}
            </Typography>

            {/* Rows */}
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace', textAlign: 'center' }}>
                {file.rows_processed?.toLocaleString() || '—'}
            </Typography>

            {/* Status */}
            <Chip
                icon={isSuccess ? <SuccessIcon sx={{ fontSize: 14 }} /> : <FailIcon sx={{ fontSize: 14 }} />}
                label={isSuccess ? 'Success' : 'Failed'}
                size="small"
                sx={{
                    height: 22,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    backgroundColor: alpha(statusColor, 0.12),
                    color: statusColor,
                    border: `1px solid ${alpha(statusColor, 0.3)}`,
                    '& .MuiChip-label': { px: 0.5 },
                    '& .MuiChip-icon': { color: statusColor },
                }}
            />


            {/* Processed At */}
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}>
                {file.processed_at ? new Date(file.processed_at).toLocaleString() : '—'}
            </Typography>

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Tooltip title="Download original file">
                    <IconButton
                        size="small"
                        onClick={() => onDownload(file.id, file.original_filename)}
                        sx={{
                            width: 30, height: 30,
                            color: 'text.secondary',
                            '&:hover': { color: palette.info, backgroundColor: alpha(palette.info, 0.1) },
                        }}
                    >
                        <DownloadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

/* ─── File Group (Collapsible) ───────────────────────────────────── */
function FileGroup({ groupName, items, onDownload, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Box sx={{ borderBottom: `1px solid ${palette.border}` }}>
            <Box
                onClick={() => setOpen(!open)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    cursor: 'pointer',
                    backgroundColor: alpha(palette.accentPrimary, 0.04),
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.08) },
                }}
            >
                <IconButton size="small" sx={{ p: 0.5, mr: 1, color: palette.accentPrimary }}>
                    {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                </IconButton>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: palette.textPrimary, fontFamily: '"JetBrains Mono", monospace' }}>
                    {groupName}
                </Typography>
                <Chip
                    label={`${items.length} file${items.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                        ml: 2, height: 20, fontSize: '0.65rem', fontWeight: 600,
                        backgroundColor: alpha(palette.accentPrimary, 0.15),
                        color: palette.accentPrimary,
                    }}
                />
            </Box>
            <Collapse in={open}>
                <Box sx={{ backgroundColor: alpha(palette.bgPrimary, 0.2) }}>
                    {items.map((file, idx) => (
                        <FileRow key={file.id} file={file} index={idx + 1} onDownload={onDownload} />
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function FileManagerPage() {
    const [files, setFiles] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchFiles = useCallback(async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (statusFilter !== 'all') params.status = statusFilter;
            const res = await api.get('/transformation/file-manager/', { params });
            setFiles(res.data);
        } catch {
            // silent
        }
    }, [search, statusFilter]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Group Files
    const groupedFiles = useMemo(() => {
        const groups = {};
        files.forEach(file => {
            const typeLabel = (file.run_type || '').toLowerCase() === 'swift' ? 'SWIFT' : 'Transformation';
            let dateStr = 'Unknown Date';
            if (file.processed_at) {
                const dt = new Date(file.processed_at);
                const d = String(dt.getDate()).padStart(2, '0');
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const y = dt.getFullYear();
                dateStr = `${d}-${m}-${y}`;
            }
            const groupName = `${typeLabel} Source files - ${dateStr}`;
            
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(file);
        });
        
        // Return sorted (most recent groups first usually, since items are sorted by processed_at desc)
        return Object.entries(groups).map(([name, items]) => ({ name, items }));
    }, [files]);

    const handleDownload = async (id, filename) => {
        try {
            const res = await api.get(`/transformation/file-manager/${id}/download/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setSnackbar({ open: true, message: 'Download failed', severity: 'error' });
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
                        Source Files
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Browse and download source files processed by transformation packages
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton
                        onClick={fetchFiles}
                        sx={{
                            color: palette.accentPrimary,
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.1) },
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
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
                {/* Search + Filters */}
                <Box
                    sx={{
                        px: 2, py: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.4),
                        flexWrap: 'wrap',
                        gap: 1,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Search files, packages..."
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
                        <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
                        {files.length} file{files.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>

                {/* Column Headers */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '40px 2fr 1.2fr 0.8fr 0.5fr 0.5fr 0.7fr 1.2fr 50px',
                        px: 0,
                        py: 0,
                        borderBottom: `2px solid ${palette.accentPrimary}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.3),
                        '& > *': {
                            px: 1,
                            py: 1,
                            borderRight: `1px solid ${alpha(palette.border, 0.5)}`,
                            '&:last-child': { borderRight: 'none' },
                        },
                    }}
                >
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>#</Typography>
                    <Typography sx={headerCellSx}>Source File</Typography>
                    <Typography sx={headerCellSx}>Output File</Typography>
                    <Typography sx={headerCellSx}>Package</Typography>
                    <Typography sx={headerCellSx}>Size</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Rows</Typography>
                    <Typography sx={headerCellSx}>Status</Typography>
                    <Typography sx={headerCellSx}>Processed At</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>DL</Typography>
                </Box>

                {/* Rows / Groups */}
                {groupedFiles.length > 0 ? (
                    groupedFiles.map((group, idx) => (
                        <Fade in key={group.name} timeout={150 + idx * 30}>
                            <Box>
                                <FileGroup
                                    groupName={group.name}
                                    items={group.items}
                                    onDownload={handleDownload}
                                    defaultOpen={idx === 0} // Open the first group by default
                                />
                            </Box>
                        </Fade>
                    ))
                ) : (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        <FilterIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                        <Typography variant="body2">No source files found.</Typography>
                        <Typography variant="caption" color="text.disabled">
                            Files will appear here after packages process inbound files.
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
