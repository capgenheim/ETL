import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Chip, Button, IconButton, Tooltip,
    TextField, InputAdornment, CircularProgress, Snackbar, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, TablePagination,
} from '@mui/material';
import {
    Upload as UploadIcon, Download as DownloadIcon, Refresh as RefreshIcon,
    Delete as DeleteIcon, Search as SearchIcon, Visibility as ViewIcon,
    Close as CloseIcon, SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';
import api from '../services/api';

const ROWS_PER_PAGE = 25;

const STATUS_COLORS = {
    processed: palette.success,
    failed: palette.error,
};

const headerCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: palette.accentPrimary,
    textTransform: 'uppercase',
};

export default function SwiftPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            const res = await api.get('/transformation/swift-messages/', { params });
            setMessages(res.data);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [search]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);
    useEffect(() => { setPage(0); }, [search]);

    // Group messages by daily date for headers
    const groupByDate = (msgs) => {
        const groups = [];
        let lastDate = null;
        msgs.forEach((m) => {
            const d = m.processed_at ? new Date(m.processed_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
            }) : 'Unknown Date';
            if (d !== lastDate) {
                groups.push({ type: 'header', date: d });
                lastDate = d;
            }
            groups.push({ type: 'row', data: m });
        });
        return groups;
    };

    const paginated = messages.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);
    const grouped = groupByDate(paginated);

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            fd.append('file', files[i]);
        }
        try {
            const res = await api.post('/transformation/swift-messages/upload/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSnack({ open: true, msg: res.data.message, severity: 'success' });
            fetchMessages();
        } catch (err) {
            setSnack({ open: true, msg: err.response?.data?.error || 'Upload failed', severity: 'error' });
        }
        setUploading(false);
        e.target.value = '';
    };

    const handleDownload = async (id, filename) => {
        try {
            const res = await api.get(`/transformation/swift-messages/${id}/download/`, {
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
            setSnack({ open: true, msg: 'Download failed', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/transformation/swift-messages/${deleteTarget.id}/`);
            setSnack({ open: true, msg: 'Message deleted', severity: 'success' });
            setDeleteOpen(false);
            fetchMessages();
        } catch {
            setSnack({ open: true, msg: 'Delete failed', severity: 'error' });
        }
    };

    const handleViewDetail = async (id) => {
        try {
            const res = await api.get(`/transformation/swift-messages/${id}/`);
            setDetailData(res.data);
            setDetailOpen(true);
        } catch {
            setSnack({ open: true, msg: 'Failed to load details', severity: 'error' });
        }
    };

    const processedCount = messages.filter(m => m.status === 'processed').length;
    const failedCount = messages.filter(m => m.status === 'failed').length;

    const gridCols = '36px 48px 100px 1fr 120px 120px 56px 130px 80px';

    return (
        <Box>
            {/* Page Header — standard style */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        SWIFT Messages
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {messages.length} messages — {processedCount} processed, {failedCount} failed
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchMessages}
                            sx={{ color: palette.accentPrimary, '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.1) } }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" size="small" startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                        component="label" disabled={uploading}
                        sx={{
                            backgroundColor: palette.accentPrimary, color: '#000',
                            fontWeight: 700, fontSize: '0.75rem',
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                        }}>
                        Upload SWIFT File
                        <input type="file" hidden multiple accept=".fin,.txt,.swift,.mt,.xml" onChange={handleUpload} />
                    </Button>
                </Box>
            </Box>

            {/* Search */}
            <Paper sx={{
                display: 'flex', gap: 1.5, mb: 2, p: 1.5, alignItems: 'center',
                backgroundColor: alpha(palette.bgSurface, 0.5),
                border: `1px solid ${palette.border}`, borderRadius: 2,
            }}>
                <TextField size="small" placeholder="Search MT type, reference, BIC, filename..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                    }}
                    sx={{ width: 360, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }}
                />
            </Paper>

            {/* Grid Table */}
            <Paper sx={{
                backgroundColor: alpha(palette.bgSurface, 0.5),
                border: `1px solid ${palette.border}`, borderRadius: 2, overflow: 'hidden',
            }}>
                {/* Header */}
                <Box sx={{
                    display: 'grid', gridTemplateColumns: gridCols, px: 1.5, py: 1,
                    borderBottom: `2px solid ${alpha(palette.accentPrimary, 0.3)}`,
                    backgroundColor: alpha(palette.bgSecondary, 0.3),
                }}>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>#</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Tag</Typography>
                    <Typography sx={headerCellSx}>Type</Typography>
                    <Typography sx={headerCellSx}>Reference / Filename</Typography>
                    <Typography sx={headerCellSx}>Sender</Typography>
                    <Typography sx={headerCellSx}>Receiver</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Status</Typography>
                    <Typography sx={headerCellSx}>Processed</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Actions</Typography>
                </Box>

                {/* Rows */}
                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} /></Box>
                ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <SwapIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.disabled" fontWeight={600}>No SWIFT Messages Yet</Typography>
                        <Typography variant="caption" color="text.disabled">
                            Upload a SWIFT message file or drop files in sft_inbound/
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Box sx={{ maxHeight: 'calc(100vh - 330px)', overflowY: 'auto' }}>
                            {grouped.map((item, idx) => {
                                if (item.type === 'header') {
                                    return (
                                        <Box key={`hdr-${idx}`} sx={{
                                            px: 1.5, py: 0.6,
                                            backgroundColor: alpha(palette.accentPrimary, 0.06),
                                            borderBottom: `1px solid ${alpha(palette.border, 0.3)}`,
                                        }}>
                                            <Typography sx={{
                                                fontSize: '0.65rem', fontWeight: 700,
                                                color: palette.accentPrimary,
                                                fontFamily: '"JetBrains Mono", monospace',
                                                letterSpacing: '0.04em',
                                            }}>
                                                ▸ {item.date}
                                            </Typography>
                                        </Box>
                                    );
                                }
                                const m = item.data;
                                const statusColor = STATUS_COLORS[m.status] || palette.textDisabled;
                                const isMT = m.message_type?.startsWith('MT');
                                const formatTag = isMT ? '#MT' : '#MX';
                                const tagColor = isMT ? '#FF9800' : '#4FC3F7';
                                return (
                                    <Box key={m.id} sx={{
                                        display: 'grid', gridTemplateColumns: gridCols, px: 1.5,
                                        borderBottom: `1px solid ${alpha(palette.border, 0.3)}`,
                                        '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.03) },
                                        alignItems: 'center',
                                    }}>
                                        <Typography sx={{ fontSize: '0.65rem', textAlign: 'center', color: 'text.disabled', py: 0.6 }}>
                                            {page * ROWS_PER_PAGE + (grouped.slice(0, idx).filter(i => i.type === 'row').length) + 1}
                                        </Typography>
                                        <Box sx={{ textAlign: 'center', py: 0.6 }}>
                                            <Chip label={formatTag} size="small" sx={{
                                                height: 18, fontSize: '0.55rem', fontWeight: 800,
                                                backgroundColor: alpha(tagColor, 0.15),
                                                color: tagColor,
                                                fontFamily: '"JetBrains Mono", monospace',
                                            }} />
                                        </Box>
                                        <Tooltip title={m.message_type_description || m.message_type} arrow>
                                            <Box sx={{ py: 0.6 }}>
                                                <Typography sx={{
                                                    fontSize: '0.72rem', fontFamily: '"JetBrains Mono", monospace',
                                                    fontWeight: 700, color: palette.accentPrimary,
                                                }}>
                                                    {m.message_type}
                                                </Typography>
                                                <Typography sx={{
                                                    fontSize: '0.55rem', color: 'text.secondary',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {m.message_type_description}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                        <Box sx={{ py: 0.6, overflow: 'hidden' }}>
                                            <Typography sx={{
                                                fontSize: '0.7rem', fontFamily: '"JetBrains Mono", monospace',
                                                fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {m.reference || '—'}
                                            </Typography>
                                            <Typography sx={{
                                                fontSize: '0.58rem', color: 'text.disabled',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {m.original_filename}
                                            </Typography>
                                        </Box>
                                        <Tooltip title={m.sender_bic} arrow>
                                            <Typography sx={{
                                                fontSize: '0.62rem', fontFamily: '"JetBrains Mono", monospace',
                                                fontWeight: 600, py: 0.6,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {m.sender_bic || '—'}
                                            </Typography>
                                        </Tooltip>
                                        <Tooltip title={m.receiver_bic} arrow>
                                            <Typography sx={{
                                                fontSize: '0.62rem', fontFamily: '"JetBrains Mono", monospace',
                                                fontWeight: 600, py: 0.6,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {m.receiver_bic || '—'}
                                            </Typography>
                                        </Tooltip>
                                        <Box sx={{ textAlign: 'center', py: 0.6 }}>
                                            <Chip
                                                label={m.status === 'processed' ? '✓' : '✗'}
                                                size="small"
                                                sx={{
                                                    height: 20, fontSize: '0.6rem', fontWeight: 700,
                                                    backgroundColor: alpha(statusColor, 0.15),
                                                    color: statusColor,
                                                }}
                                            />
                                        </Box>
                                        <Typography sx={{
                                            fontSize: '0.58rem', color: 'text.secondary',
                                            fontFamily: '"JetBrains Mono", monospace', py: 0.6,
                                        }}>
                                            {m.processed_at ? new Date(m.processed_at).toLocaleTimeString() : '—'}
                                        </Typography>
                                        <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 0.3, py: 0.6 }}>
                                            <Tooltip title="View parsed fields">
                                                <IconButton size="small" onClick={() => handleViewDetail(m.id)}
                                                    sx={{ color: palette.info, p: 0.3 }}>
                                                    <ViewIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                            {m.excel_filename && (
                                                <Tooltip title="Download Excel">
                                                    <IconButton size="small"
                                                        onClick={() => handleDownload(m.id, m.excel_filename)}
                                                        sx={{ color: palette.success, p: 0.3 }}>
                                                        <DownloadIcon sx={{ fontSize: 15 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Delete">
                                                <IconButton size="small"
                                                    onClick={() => { setDeleteTarget(m); setDeleteOpen(true); }}
                                                    sx={{ color: palette.error, p: 0.3 }}>
                                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                        <TablePagination
                            component="div" count={messages.length} page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={ROWS_PER_PAGE} rowsPerPageOptions={[ROWS_PER_PAGE]}
                            sx={{ borderTop: `1px solid ${palette.border}`, '.MuiTablePagination-toolbar': { minHeight: 40 } }}
                        />
                    </>
                )}
            </Paper>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth
                PaperProps={{ sx: { backgroundColor: palette.bgSecondary, border: `1px solid ${palette.border}` } }}>
                {detailData && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                            <Box>
                                <Typography sx={{ fontWeight: 700 }}>
                                    {detailData.message_type} — {detailData.message_type_description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {detailData.sender_bic} → {detailData.receiver_bic} | Ref: {detailData.reference}
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => setDetailOpen(false)}>
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ pt: 1 }}>
                            {/* Parsed fields table */}
                            <Box sx={{
                                display: 'grid', gridTemplateColumns: '50px 60px 1fr 140px 1fr',
                                gap: 0, borderBottom: `2px solid ${alpha(palette.accentPrimary, 0.3)}`,
                                mb: 0.5, pb: 0.5,
                            }}>
                                {['#', 'Tag', 'Value', 'Field Name', 'Description'].map(h => (
                                    <Typography key={h} sx={{ ...headerCellSx, fontSize: '0.55rem' }}>{h}</Typography>
                                ))}
                            </Box>
                            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                {(detailData.parsed_json?.fields || [])
                                    .filter(f => f.tag !== '16R' && f.tag !== '16S')
                                    .map((f, idx) => (
                                        <Box key={idx} sx={{
                                            display: 'grid', gridTemplateColumns: '50px 60px 1fr 140px 1fr',
                                            py: 0.3, borderBottom: `1px solid ${alpha(palette.border, 0.2)}`,
                                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.03) },
                                        }}>
                                            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', textAlign: 'center' }}>
                                                {idx + 1}
                                            </Typography>
                                            <Typography sx={{
                                                fontSize: '0.62rem', fontFamily: '"JetBrains Mono", monospace',
                                                fontWeight: 700, color: palette.accentPrimary,
                                            }}>
                                                :{f.tag}:
                                            </Typography>
                                            <Typography sx={{
                                                fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace',
                                            }}>
                                                {f.display}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 600 }}>
                                                {f.field_name}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>
                                                {f.description}
                                            </Typography>
                                        </Box>
                                    ))}
                            </Box>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { backgroundColor: palette.bgSecondary, border: `1px solid ${palette.border}` } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Message?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Remove <strong>{deleteTarget?.message_type} {deleteTarget?.reference}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleDelete}
                        sx={{ backgroundColor: palette.error, '&:hover': { backgroundColor: alpha(palette.error, 0.8) } }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
