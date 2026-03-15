import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Chip,
    Tooltip,
    Snackbar,
    Alert,
    Fade,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    InputAdornment,
    TablePagination,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Inbox as InboxIcon,
    CheckCircle as ReadyIcon,
    Warning as WarningIcon,
    Close as CloseIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

/* ─── Status Filter ──────────────────────────────────────────────── */
function StatusFilterChips({ value, onChange }) {
    const filters = [
        { key: 'all', label: 'All' },
        { key: 'ready', label: '✅ Ready', color: palette.success },
        { key: 'no_package', label: '⚠ No Package', color: palette.warning },
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
function UnprocessedRow({ file, index, onDownload, onDelete }) {
    const hasPackage = file.status === 'ready';
    const statusColor = hasPackage ? palette.success : palette.warning;

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
                gridTemplateColumns: '40px 2fr 1fr 0.8fr 1.2fr 100px',
                alignItems: 'center',
                px: 0,
                py: 0,
                borderBottom: `1px solid ${palette.border}`,
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.04) },
                '& > *': {
                    px: 1,
                    py: 1.25,
                    borderRight: `1px solid ${alpha(palette.border, 0.5)}`,
                    '&:last-child': { borderRight: 'none' },
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

            {/* Filename + Tags */}
            <Box sx={{ overflow: 'hidden' }}>
                <Tooltip title={file.filename}>
                    <Typography
                        sx={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: palette.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: '"JetBrains Mono", monospace',
                            mb: 0.3,
                        }}
                    >
                        {file.filename}
                    </Typography>
                </Tooltip>
                {file.tags?.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                        {file.tags.map((tag, i) => (
                            <Chip
                                key={i}
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

            {/* Size */}
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace' }}>
                {formatSize(file.size)}
            </Typography>

            {/* Status */}
            <Chip
                icon={hasPackage ? <ReadyIcon sx={{ fontSize: 14 }} /> : <WarningIcon sx={{ fontSize: 14 }} />}
                label={hasPackage ? 'Ready' : 'No Package'}
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

            {/* Matched Package */}
            <Typography
                sx={{
                    fontSize: '0.75rem',
                    color: hasPackage ? palette.accentPrimary : palette.textDisabled,
                    fontWeight: hasPackage ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontStyle: hasPackage ? 'normal' : 'italic',
                }}
            >
                {file.matched_package?.name || 'No matching package'}
            </Typography>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                <Tooltip title="Download">
                    <IconButton
                        size="small"
                        onClick={() => onDownload(file.filename)}
                        sx={{
                            width: 30, height: 30,
                            color: 'text.secondary',
                            '&:hover': { color: palette.info, backgroundColor: alpha(palette.info, 0.1) },
                        }}
                    >
                        <DownloadIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                    <IconButton
                        size="small"
                        onClick={() => onDelete(file.filename)}
                        sx={{
                            width: 30, height: 30,
                            color: 'text.secondary',
                            '&:hover': { color: palette.error, backgroundColor: alpha(palette.error, 0.1) },
                        }}
                    >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

const ROWS_PER_PAGE = 20;

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function UnprocessedFilesPage() {
    const [files, setFiles] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, filename: '' });

    const fetchFiles = useCallback(async () => {
        try {
            const res = await api.get('/transformation/unprocessed/');
            setFiles(res.data);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleDownload = async (filename) => {
        try {
            const res = await api.get(`/transformation/unprocessed/download/${encodeURIComponent(filename)}/`, {
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

    const handleDeleteConfirm = async () => {
        const { filename } = deleteDialog;
        setDeleteDialog({ open: false, filename: '' });
        try {
            await api.delete(`/transformation/unprocessed/delete/${encodeURIComponent(filename)}/`);
            setSnackbar({ open: true, message: `Deleted: ${filename}`, severity: 'success' });
            fetchFiles();
        } catch {
            setSnackbar({ open: true, message: 'Delete failed', severity: 'error' });
        }
    };

    const filtered = files.filter((f) => {
        // Status filter
        if (statusFilter !== 'all' && f.status !== statusFilter) return false;
        // Search filter
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            f.filename.toLowerCase().includes(q) ||
            (f.matched_package?.name || '').toLowerCase().includes(q)
        );
    });

    const totalSize = filtered.reduce((sum, f) => sum + (f.size || 0), 0);
    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const readyCount = filtered.filter((f) => f.status === 'ready').length;
    const noPackageCount = filtered.filter((f) => f.status === 'no_package').length;
    const paginated = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

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
                        Unprocessed Files
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Files in the inbound queue awaiting processing — {filtered.length} file{filtered.length !== 1 ? 's' : ''} ({formatSize(totalSize)})
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {readyCount > 0 && (
                        <Chip
                            icon={<ReadyIcon sx={{ fontSize: 14 }} />}
                            label={`${readyCount} Ready`}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                fontFamily: '"JetBrains Mono", monospace',
                                backgroundColor: alpha(palette.success, 0.12),
                                color: palette.success,
                                border: `1px solid ${alpha(palette.success, 0.3)}`,
                            }}
                        />
                    )}
                    {noPackageCount > 0 && (
                        <Chip
                            icon={<WarningIcon sx={{ fontSize: 14 }} />}
                            label={`${noPackageCount} No Package`}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                fontFamily: '"JetBrains Mono", monospace',
                                backgroundColor: alpha(palette.warning, 0.12),
                                color: palette.warning,
                                border: `1px solid ${alpha(palette.warning, 0.3)}`,
                            }}
                        />
                    )}
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
                {/* Search Bar */}
                <Box
                    sx={{
                        px: 2, py: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.4),
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Search by filename or package..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
                        <StatusFilterChips value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
                        {filtered.length} file{filtered.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>

                {/* Column Headers */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '40px 2fr 1fr 0.8fr 1.2fr 100px',
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
                    <Typography sx={headerCellSx}>Filename</Typography>
                    <Typography sx={headerCellSx}>Size</Typography>
                    <Typography sx={headerCellSx}>Status</Typography>
                    <Typography sx={headerCellSx}>Matched Package</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Actions</Typography>
                </Box>

                {/* Rows */}
                {paginated.length > 0 ? (
                    paginated.map((file, idx) => (
                        <Fade in key={file.filename} timeout={150 + idx * 30}>
                            <Box>
                                <UnprocessedRow
                                    file={file}
                                    index={page * ROWS_PER_PAGE + idx + 1}
                                    onDownload={handleDownload}
                                    onDelete={(filename) => setDeleteDialog({ open: true, filename })}
                                />
                            </Box>
                        </Fade>
                    ))
                ) : (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        <InboxIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                        <Typography variant="body2">{search ? 'No files match your search.' : 'No unprocessed files in the queue.'}</Typography>
                        <Typography variant="caption" color="text.disabled">
                            {search ? 'Try a different search term.' : 'Drop files into trfm_inbound/ and they will appear here.'}
                        </Typography>
                    </Box>
                )}

                {/* Pagination */}
                {filtered.length > ROWS_PER_PAGE && (
                    <TablePagination
                        component="div"
                        count={filtered.length}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={ROWS_PER_PAGE}
                        rowsPerPageOptions={[ROWS_PER_PAGE]}
                        sx={{
                            borderTop: `1px solid ${palette.border}`,
                            '& .MuiTablePagination-toolbar': {
                                minHeight: 44,
                            },
                        }}
                    />
                )}
            </Paper>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, filename: '' })}
                PaperProps={{
                    sx: {
                        backgroundColor: palette.bgPrimary,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 2,
                        backgroundImage: 'none',
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, color: palette.textPrimary, fontSize: '0.95rem' }}>
                        Confirm Delete
                    </Typography>
                    <IconButton
                        onClick={() => setDeleteDialog({ open: false, filename: '' })}
                        size="small"
                        sx={{ color: 'text.secondary' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to delete{' '}
                        <strong style={{ color: palette.textPrimary }}>{deleteDialog.filename}</strong>
                        {' '}from the inbound queue? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteDialog({ open: false, filename: '' })}
                        sx={{ color: 'text.secondary' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        color="error"
                        sx={{ fontWeight: 600 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

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
