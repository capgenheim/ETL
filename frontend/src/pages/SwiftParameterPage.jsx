import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Chip, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, IconButton, Tooltip, Select, MenuItem,
    FormControl, InputLabel, FormControlLabel, Switch, CircularProgress,
    InputAdornment, Snackbar, Alert, TablePagination,
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Download as DownloadIcon, Upload as UploadIcon, Search as SearchIcon,
    Close as CloseIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';
import api from '../services/api';

const CATEGORIES = ['MT', 'MX', 'BIC', 'GENERAL'];
const DATA_TYPES = [
    'TEXT', 'AMOUNT', 'DATE', 'DATETIME', 'BIC', 'ACCOUNT',
    'CURRENCY', 'CODE', 'NARRATIVE', 'QUANTITY', 'RATE', 'ISIN', 'REFERENCE',
];
const CAT_COLORS = {
    MT: palette.accentPrimary,
    MX: palette.info,
    BIC: '#e57373',
    GENERAL: '#ba68c8',
};

const ROWS_PER_PAGE = 25;

const EMPTY_FORM = {
    category: 'MT', message_type: '', field_tag: '', field_name: '',
    description: '', data_type: 'TEXT', is_mandatory: false, max_length: '',
    format_pattern: '', sample_value: '', status: 'active',
};

const headerCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: palette.accentPrimary,
    textTransform: 'uppercase',
};

export default function SwiftParameterPage() {
    const [params, setParams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const [importLoading, setImportLoading] = useState(false);

    const fetchParams = useCallback(async () => {
        setLoading(true);
        try {
            const q = {};
            if (catFilter !== 'all') q.category = catFilter;
            if (search) q.search = search;
            const res = await api.get('/transformation/swift-params/', { params: q });
            setParams(res.data);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [catFilter, search]);

    useEffect(() => { fetchParams(); }, [fetchParams]);
    useEffect(() => { setPage(0); }, [search, catFilter]);

    const paginated = params.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

    const openCreate = () => { setEditId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
    const openEdit = (p) => {
        setEditId(p.id);
        setForm({
            category: p.category, message_type: p.message_type, field_tag: p.field_tag,
            field_name: p.field_name, description: p.description, data_type: p.data_type,
            is_mandatory: p.is_mandatory, max_length: p.max_length || '',
            format_pattern: p.format_pattern, sample_value: p.sample_value, status: p.status,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const payload = { ...form };
        if (payload.max_length === '' || payload.max_length === null) delete payload.max_length;
        else payload.max_length = parseInt(payload.max_length);
        try {
            if (editId) {
                await api.put(`/transformation/swift-params/${editId}/`, payload);
                setSnack({ open: true, msg: 'Parameter updated', severity: 'success' });
            } else {
                await api.post('/transformation/swift-params/', payload);
                setSnack({ open: true, msg: 'Parameter created', severity: 'success' });
            }
            setDialogOpen(false);
            fetchParams();
        } catch (e) {
            setSnack({ open: true, msg: e.response?.data?.error || 'Error saving', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/transformation/swift-params/${editId}/`);
            setSnack({ open: true, msg: 'Parameter deleted', severity: 'success' });
            setDeleteOpen(false);
            fetchParams();
        } catch (e) {
            setSnack({ open: true, msg: 'Delete failed', severity: 'error' });
        }
    };

    const handleExport = () => {
        window.open('/api/transformation/swift-params/export/', '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportLoading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await api.post('/transformation/swift-params/import/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSnack({ open: true, msg: res.data.message, severity: 'success' });
            fetchParams();
        } catch (e) {
            setSnack({ open: true, msg: e.response?.data?.error || 'Import failed', severity: 'error' });
        }
        setImportLoading(false);
        e.target.value = '';
    };

    const gridCols = '36px 66px 86px 78px 1.2fr 74px 50px 50px 1fr 70px';

    return (
        <Box>
            {/* Page Header — standard style */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        SWIFT Parameters
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {params.length} parameters — field definitions for MT, MX, BIC, and general SWIFT standards
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title="Export CSV">
                        <IconButton onClick={handleExport}
                            sx={{ color: palette.accentPrimary, '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.1) } }}>
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Import CSV / Excel">
                        <IconButton component="label" disabled={importLoading}
                            sx={{ color: palette.accentPrimary, '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.1) } }}>
                            {importLoading ? <CircularProgress size={20} /> : <UploadIcon />}
                            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleImport} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchParams}
                            sx={{ color: palette.accentPrimary, '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.1) } }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" size="small" startIcon={<AddIcon />}
                        onClick={openCreate}
                        sx={{
                            ml: 1, backgroundColor: palette.accentPrimary, color: '#000',
                            fontWeight: 700, fontSize: '0.75rem',
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                        }}>
                        Add Parameter
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Paper sx={{
                display: 'flex', gap: 1.5, mb: 2, p: 1.5, alignItems: 'center', flexWrap: 'wrap',
                backgroundColor: alpha(palette.bgSurface, 0.5),
                border: `1px solid ${palette.border}`, borderRadius: 2,
            }}>
                <TextField size="small" placeholder="Search tags, fields, descriptions..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                    }}
                    sx={{ width: 280, '& .MuiOutlinedInput-root': { fontSize: '0.8rem' } }}
                />
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {[{ key: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ key: c, label: c }))].map(f => {
                        const active = catFilter === f.key;
                        const chipColor = CAT_COLORS[f.key] || palette.textSecondary;
                        return (
                            <Chip key={f.key} label={f.label} size="small"
                                onClick={() => setCatFilter(f.key)}
                                sx={{
                                    height: 24, fontSize: '0.65rem', fontWeight: 700,
                                    fontFamily: '"JetBrains Mono", monospace', cursor: 'pointer',
                                    backgroundColor: active ? alpha(chipColor, 0.15) : 'transparent',
                                    color: active ? chipColor : palette.textDisabled,
                                    border: `1px solid ${active ? alpha(chipColor, 0.4) : palette.border}`,
                                    '& .MuiChip-label': { px: 1 },
                                    '&:hover': { backgroundColor: alpha(chipColor, 0.1) },
                                }}
                            />
                        );
                    })}
                </Box>
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
                    <Typography sx={headerCellSx}>Cat</Typography>
                    <Typography sx={headerCellSx}>Msg Type</Typography>
                    <Typography sx={headerCellSx}>Field Tag</Typography>
                    <Typography sx={headerCellSx}>Field Name</Typography>
                    <Typography sx={headerCellSx}>Data Type</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Req</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Status</Typography>
                    <Typography sx={headerCellSx}>Sample Value</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Actions</Typography>
                </Box>

                {/* Rows */}
                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} /></Box>
                ) : params.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography color="text.disabled">No parameters found</Typography>
                    </Box>
                ) : (
                    <>
                        <Box sx={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                            {paginated.map((p, idx) => (
                                <Box key={p.id} sx={{
                                    display: 'grid', gridTemplateColumns: gridCols, px: 1.5,
                                    borderBottom: `1px solid ${alpha(palette.border, 0.3)}`,
                                    '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.03) },
                                    alignItems: 'center',
                                }}>
                                    <Typography sx={{ fontSize: '0.65rem', textAlign: 'center', color: 'text.disabled', py: 0.6 }}>
                                        {page * ROWS_PER_PAGE + idx + 1}
                                    </Typography>
                                    <Box sx={{ py: 0.6 }}>
                                        <Chip label={p.category} size="small" sx={{
                                            height: 20, fontSize: '0.6rem', fontWeight: 700,
                                            fontFamily: '"JetBrains Mono", monospace',
                                            backgroundColor: alpha(CAT_COLORS[p.category] || palette.info, 0.15),
                                            color: CAT_COLORS[p.category] || palette.info,
                                        }} />
                                    </Box>
                                    <Tooltip title={p.message_type} arrow>
                                        <Typography sx={{ fontSize: '0.68rem', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, py: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.message_type}
                                        </Typography>
                                    </Tooltip>
                                    <Tooltip title={p.field_tag} arrow>
                                        <Typography sx={{
                                            fontSize: '0.68rem', fontFamily: '"JetBrains Mono", monospace',
                                            fontWeight: 600, color: palette.accentPrimary, py: 0.6,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {p.field_tag}
                                        </Typography>
                                    </Tooltip>
                                    <Tooltip title={p.description || p.field_name} arrow>
                                        <Typography sx={{ fontSize: '0.72rem', py: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.field_name}
                                        </Typography>
                                    </Tooltip>
                                    <Typography sx={{ fontSize: '0.6rem', fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary', py: 0.6 }}>
                                        {p.data_type}
                                    </Typography>
                                    <Box sx={{ textAlign: 'center', py: 0.6 }}>
                                        {p.is_mandatory && (
                                            <Chip label="Y" size="small" sx={{
                                                height: 18, fontSize: '0.55rem', fontWeight: 700,
                                                backgroundColor: alpha(palette.success, 0.15), color: palette.success,
                                            }} />
                                        )}
                                    </Box>
                                    <Box sx={{ textAlign: 'center', py: 0.6 }}>
                                        <Box sx={{
                                            width: 8, height: 8, borderRadius: '50%', mx: 'auto',
                                            backgroundColor: p.status === 'active' ? palette.success : palette.error,
                                        }} />
                                    </Box>
                                    <Tooltip title={p.sample_value || '—'} arrow>
                                        <Typography sx={{
                                            fontSize: '0.6rem', fontFamily: '"JetBrains Mono", monospace',
                                            color: 'text.disabled', py: 0.6,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {p.sample_value || '—'}
                                        </Typography>
                                    </Tooltip>
                                    <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 0.5, py: 0.6 }}>
                                        <IconButton size="small" onClick={() => openEdit(p)}
                                            sx={{ color: palette.info, p: 0.3 }}>
                                            <EditIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                        <IconButton size="small"
                                            onClick={() => { setEditId(p.id); setForm(p); setDeleteOpen(true); }}
                                            sx={{ color: palette.error, p: 0.3 }}>
                                            <DeleteIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                        <TablePagination
                            component="div" count={params.length} page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={ROWS_PER_PAGE} rowsPerPageOptions={[ROWS_PER_PAGE]}
                            sx={{ borderTop: `1px solid ${palette.border}`, '.MuiTablePagination-toolbar': { minHeight: 40 } }}
                        />
                    </>
                )}
            </Paper>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { backgroundColor: palette.bgSecondary, border: `1px solid ${palette.border}` } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{editId ? 'Edit Parameter' : 'Create Parameter'}</Typography>
                    <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select value={form.category} label="Category"
                                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Message Type" value={form.message_type}
                            onChange={(e) => setForm({ ...form, message_type: e.target.value })}
                            placeholder="e.g. MT103, pacs.008" />
                        <TextField size="small" label="Field Tag" value={form.field_tag}
                            onChange={(e) => setForm({ ...form, field_tag: e.target.value })}
                            placeholder="e.g. :20:, MsgId" />
                        <TextField size="small" label="Field Name" value={form.field_name}
                            onChange={(e) => setForm({ ...form, field_name: e.target.value })}
                            placeholder="e.g. Transaction Reference" />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Data Type</InputLabel>
                            <Select value={form.data_type} label="Data Type"
                                onChange={(e) => setForm({ ...form, data_type: e.target.value })}>
                                {DATA_TYPES.map(dt => <MenuItem key={dt} value={dt}>{dt}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Max Length" type="number" value={form.max_length}
                            onChange={(e) => setForm({ ...form, max_length: e.target.value })} />
                        <TextField size="small" label="Format Pattern" value={form.format_pattern}
                            onChange={(e) => setForm({ ...form, format_pattern: e.target.value })}
                            placeholder="e.g. 16x, 6!n3!a15d" />
                        <TextField size="small" label="Sample Value" value={form.sample_value}
                            onChange={(e) => setForm({ ...form, sample_value: e.target.value })} />
                    </Box>
                    <TextField size="small" label="Description" fullWidth multiline rows={2}
                        value={form.description} sx={{ mt: 2 }}
                        onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <Box sx={{ display: 'flex', gap: 3, mt: 2, alignItems: 'center' }}>
                        <FormControlLabel
                            control={<Switch checked={form.is_mandatory} size="small"
                                onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} />}
                            label={<Typography variant="body2">Mandatory</Typography>}
                        />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={form.status} label="Status"
                                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}
                        sx={{
                            backgroundColor: palette.accentPrimary, color: '#000', fontWeight: 700,
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                        }}>
                        {editId ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { backgroundColor: palette.bgSecondary, border: `1px solid ${palette.border}` } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Parameter?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Remove <strong>{form.message_type} {form.field_tag}</strong> — {form.field_name}?
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
