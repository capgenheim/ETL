import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Button, TextField, Chip, IconButton,
    Tooltip, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, Select, MenuItem, InputLabel, Switch, FormControlLabel,
    Checkbox, FormGroup, Divider, CircularProgress, Slider,
} from '@mui/material';
import {
    Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
    Refresh as RefreshIcon, Save as SaveIcon, Close as CloseIcon,
    CheckCircle as ActiveIcon, Cancel as InactiveIcon,
    BoltOutlined as InstantIcon, Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../theme/bloombergTheme';
import api from '../services/api';

const OUTPUT_FORMATS = [
    { value: 'xlsx', label: 'Excel (XLSX)', color: '#4CAF50' },
    { value: 'csv', label: 'CSV', color: '#2196F3' },
    { value: 'json', label: 'JSON', color: '#FF9800' },
];

/* Helper: format minutes to readable string */
function formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
    return `${h}h ${m}m`;
}

const headerCellSx = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: palette.accentPrimary,
    textTransform: 'uppercase',
};

export default function SwiftPackagePage() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [types, setTypes] = useState({ MT: [], MX: [] });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editPkg, setEditPkg] = useState(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

    // Form state
    const [form, setForm] = useState({
        name: '',
        description: '',
        message_types: [],
        output_format: 'xlsx',
        processing_mode: 'instant',
        batch_interval_minutes: 30,
        file_pattern: '*.*',
        status: 'active',
        selectAll: false,
    });

    const fetchPackages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/transformation/swift-packages/');
            setPackages(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    const fetchTypes = useCallback(async () => {
        try {
            const res = await api.get('/transformation/swift-packages/types/');
            setTypes(res.data);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchPackages(); fetchTypes(); }, [fetchPackages, fetchTypes]);

    const resetForm = () => setForm({
        name: '', description: '', message_types: [],
        output_format: 'xlsx', processing_mode: 'instant',
        batch_interval_minutes: 30,
        file_pattern: '*.*', status: 'active', selectAll: false,
    });

    const openCreate = () => {
        resetForm();
        setEditPkg(null);
        setDialogOpen(true);
    };

    const openEdit = (pkg) => {
        const allTypes = [...types.MT.map(t => t.code), ...types.MX.map(t => t.code)];
        const isAll = !pkg.message_types?.length || pkg.message_types.includes('ALL');
        setForm({
            name: pkg.name,
            description: pkg.description,
            message_types: isAll ? allTypes : pkg.message_types,
            output_format: pkg.output_format,
            processing_mode: pkg.processing_mode,
            batch_interval_minutes: pkg.batch_interval_minutes || 30,
            file_pattern: pkg.file_pattern,
            status: pkg.status,
            selectAll: isAll,
        });
        setEditPkg(pkg);
        setDialogOpen(true);
    };

    const handleToggleSelectAll = () => {
        const allTypes = [...types.MT.map(t => t.code), ...types.MX.map(t => t.code)];
        if (form.selectAll) {
            setForm({ ...form, selectAll: false, message_types: [] });
        } else {
            setForm({ ...form, selectAll: true, message_types: allTypes });
        }
    };

    const handleToggleType = (code) => {
        const allTypes = [...types.MT.map(t => t.code), ...types.MX.map(t => t.code)];
        let updated;
        if (form.message_types.includes(code)) {
            updated = form.message_types.filter(t => t !== code);
        } else {
            updated = [...form.message_types, code];
        }
        setForm({
            ...form,
            message_types: updated,
            selectAll: updated.length === allTypes.length,
        });
    };

    const handleSave = async () => {
        const allTypes = [...types.MT.map(t => t.code), ...types.MX.map(t => t.code)];
        const payload = {
            name: form.name,
            description: form.description,
            message_types: form.selectAll || form.message_types.length === allTypes.length
                ? ['ALL']
                : form.message_types,
            output_format: form.output_format,
            processing_mode: form.processing_mode,
            file_pattern: form.file_pattern,
            status: form.status,
        };

        try {
            if (editPkg) {
                await api.put(`/transformation/swift-packages/${editPkg.id}/`, payload);
                setSnack({ open: true, msg: 'Package updated', severity: 'success' });
            } else {
                await api.post('/transformation/swift-packages/', payload);
                setSnack({ open: true, msg: 'Package created', severity: 'success' });
            }
            setDialogOpen(false);
            fetchPackages();
        } catch (err) {
            setSnack({ open: true, msg: err.response?.data?.error || 'Save failed', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/transformation/swift-packages/${deleteTarget.id}/`);
            setSnack({ open: true, msg: 'Package deleted', severity: 'success' });
            setDeleteOpen(false);
            fetchPackages();
        } catch {
            setSnack({ open: true, msg: 'Delete failed', severity: 'error' });
        }
    };

    const handleToggleStatus = async (pkg) => {
        const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
        try {
            await api.put(`/transformation/swift-packages/${pkg.id}/`, { status: newStatus });
            fetchPackages();
        } catch {
            setSnack({ open: true, msg: 'Status update failed', severity: 'error' });
        }
    };

    const gridCols = '40px 1fr 1.2fr 90px 110px 90px 60px 80px';

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        SWIFT Packages
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {packages.length} package(s) — configure message type filters, output formats, and processing modes
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchPackages}
                            sx={{ color: palette.accentPrimary, '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.1) } }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" size="small" startIcon={<AddIcon />}
                        onClick={openCreate}
                        sx={{
                            backgroundColor: palette.accentPrimary, color: '#000',
                            fontWeight: 700, fontSize: '0.75rem',
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                        }}>
                        Create Package
                    </Button>
                </Box>
            </Box>

            {/* Grid */}
            <Paper sx={{
                backgroundColor: alpha(palette.bgSurface, 0.5),
                border: `1px solid ${palette.border}`, borderRadius: 2, overflow: 'hidden',
            }}>
                {/* Header row */}
                <Box sx={{
                    display: 'grid', gridTemplateColumns: gridCols, px: 1.5, py: 1,
                    borderBottom: `2px solid ${alpha(palette.accentPrimary, 0.3)}`,
                    backgroundColor: alpha(palette.bgSecondary, 0.3),
                }}>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>#</Typography>
                    <Typography sx={headerCellSx}>Name</Typography>
                    <Typography sx={headerCellSx}>Message Types</Typography>
                    <Typography sx={headerCellSx}>Output</Typography>
                    <Typography sx={headerCellSx}>Mode</Typography>
                    <Typography sx={headerCellSx}>Pattern</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Status</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Actions</Typography>
                </Box>

                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} /></Box>
                ) : packages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <AddIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.disabled" fontWeight={600}>No SWIFT Packages</Typography>
                        <Typography variant="caption" color="text.disabled">
                            Create a package to control how SWIFT files are processed
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                        {packages.map((pkg, idx) => {
                            const isAll = !pkg.message_types?.length || pkg.message_types.includes('ALL');
                            const typesLabel = isAll ? 'ALL' : pkg.message_types.join(', ');
                            const isActive = pkg.status === 'active';
                            const fmtInfo = OUTPUT_FORMATS.find(f => f.value === pkg.output_format) || OUTPUT_FORMATS[0];

                            return (
                                <Box key={pkg.id} sx={{
                                    display: 'grid', gridTemplateColumns: gridCols, px: 1.5,
                                    borderBottom: `1px solid ${alpha(palette.border, 0.3)}`,
                                    '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.03) },
                                    alignItems: 'center',
                                    opacity: isActive ? 1 : 0.5,
                                }}>
                                    <Typography sx={{ fontSize: '0.65rem', textAlign: 'center', color: 'text.disabled', py: 0.8 }}>
                                        {idx + 1}
                                    </Typography>
                                    <Box sx={{ py: 0.8 }}>
                                        <Typography sx={{
                                            fontSize: '0.75rem', fontWeight: 700,
                                            color: palette.accentPrimary,
                                        }}>
                                            {pkg.name}
                                        </Typography>
                                        {pkg.description && (
                                            <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                                                {pkg.description}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ py: 0.8, display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                                        {isAll ? (
                                            <Chip label="ALL TYPES" size="small" sx={{
                                                height: 18, fontSize: '0.55rem', fontWeight: 700,
                                                backgroundColor: alpha('#4CAF50', 0.15), color: '#4CAF50',
                                            }} />
                                        ) : (
                                            pkg.message_types?.slice(0, 6).map(t => (
                                                <Chip key={t} label={t} size="small" sx={{
                                                    height: 18, fontSize: '0.5rem', fontWeight: 700,
                                                    backgroundColor: alpha(t.startsWith('MT') ? '#FF9800' : '#4FC3F7', 0.15),
                                                    color: t.startsWith('MT') ? '#FF9800' : '#4FC3F7',
                                                    fontFamily: '"JetBrains Mono", monospace',
                                                }} />
                                            ))
                                        )}
                                        {!isAll && pkg.message_types?.length > 6 && (
                                            <Chip label={`+${pkg.message_types.length - 6}`} size="small" sx={{
                                                height: 18, fontSize: '0.5rem', fontWeight: 700,
                                                backgroundColor: alpha(palette.accentPrimary, 0.1),
                                                color: palette.accentPrimary,
                                            }} />
                                        )}
                                    </Box>
                                    <Chip label={fmtInfo.label.split(' ')[0]} size="small" sx={{
                                        height: 20, fontSize: '0.55rem', fontWeight: 700,
                                        backgroundColor: alpha(fmtInfo.color, 0.15), color: fmtInfo.color,
                                    }} />
                                    <Typography sx={{
                                        fontSize: '0.6rem', fontWeight: 600,
                                        color: pkg.processing_mode === 'instant' ? '#4CAF50' : '#2196F3',
                                        fontFamily: '"JetBrains Mono", monospace',
                                    }}>
                                        {pkg.processing_mode === 'instant' ? '⚡ Instant' : '📦 Batch'}
                                    </Typography>
                                    <Typography sx={{
                                        fontSize: '0.6rem', fontFamily: '"JetBrains Mono", monospace',
                                        color: 'text.secondary',
                                    }}>
                                        {pkg.file_pattern}
                                    </Typography>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Tooltip title={isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
                                            <IconButton size="small" onClick={() => handleToggleStatus(pkg)}
                                                sx={{ color: isActive ? '#4CAF50' : '#f44336', p: 0.3 }}>
                                                {isActive ? <ActiveIcon sx={{ fontSize: 18 }} /> : <InactiveIcon sx={{ fontSize: 18 }} />}
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 0.3 }}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => openEdit(pkg)}
                                                sx={{ color: palette.info, p: 0.3 }}>
                                                <EditIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small"
                                                onClick={() => { setDeleteTarget(pkg); setDeleteOpen(true); }}
                                                sx={{ color: palette.error, p: 0.3 }}>
                                                <DeleteIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Paper>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
                PaperProps={{ sx: {
                    backgroundColor: palette.bgSecondary,
                    border: `1px solid ${alpha(palette.accentPrimary, 0.2)}`,
                    backgroundImage: `linear-gradient(135deg, ${alpha(palette.bgSecondary, 0.98)} 0%, ${alpha(palette.bgPrimary, 0.95)} 100%)`,
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: alpha(palette.border, 0.6) },
                        '&:hover fieldset': { borderColor: alpha(palette.accentPrimary, 0.4) },
                        '&.Mui-focused fieldset': { borderColor: palette.accentPrimary },
                    },
                    '& .MuiInputLabel-root': { color: alpha(palette.textPrimary, 0.5), fontSize: '0.8rem' },
                    '& .MuiInputLabel-root.Mui-focused': { color: palette.accentPrimary },
                } }}>
                <DialogTitle sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1,
                    borderBottom: `1px solid ${alpha(palette.border, 0.3)}`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 28, height: 28, borderRadius: '8px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(135deg, ${palette.accentPrimary} 0%, ${palette.accentSecondary} 100%)`,
                        }}>
                            <AddIcon sx={{ fontSize: 16, color: '#000' }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {editPkg ? 'Edit SWIFT Package' : 'Create SWIFT Package'}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setDialogOpen(false)}
                        sx={{ color: 'text.secondary', '&:hover': { color: palette.error } }}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        {/* Name & Description */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField label="Package Name" size="small" fullWidth required
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem' } }}
                            />
                            <TextField label="Description" size="small" fullWidth
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem' } }}
                            />
                        </Box>

                        {/* Output Format & Processing Mode */}
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>Output Format</InputLabel>
                                <Select value={form.output_format} label="Output Format"
                                    onChange={e => setForm({ ...form, output_format: e.target.value })}>
                                    {OUTPUT_FORMATS.map(f => (
                                        <MenuItem key={f.value} value={f.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    backgroundColor: f.color, flexShrink: 0,
                                                }} />
                                                <Typography sx={{ fontSize: '0.8rem' }}>{f.label}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField label="File Pattern" size="small"
                                value={form.file_pattern} onChange={e => setForm({ ...form, file_pattern: e.target.value })}
                                helperText="e.g. *.fin, *.xml, *.*"
                                sx={{ width: 160, '& .MuiOutlinedInput-root': { fontSize: '0.85rem' },
                                    '& .MuiFormHelperText-root': { fontSize: '0.55rem', color: alpha(palette.textPrimary, 0.3) } }}
                            />
                        </Box>

                        {/* Processing Mode — Instant / Scheduled toggle */}
                        <Box sx={{
                            p: 2, borderRadius: 1.5,
                            border: `1px solid ${alpha(palette.border, 0.4)}`,
                            backgroundColor: alpha(palette.bgSurface, 0.3),
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                <ScheduleIcon sx={{ fontSize: 16, color: palette.accentPrimary }} />
                                <Typography sx={{
                                    fontSize: '0.7rem', fontWeight: 700, color: palette.accentPrimary,
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                }}>
                                    Processing Mode
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <InstantIcon sx={{
                                        fontSize: 18,
                                        color: form.processing_mode === 'instant' ? palette.success : 'text.secondary',
                                    }} />
                                    <Typography variant="body2" sx={{
                                        fontWeight: form.processing_mode === 'instant' ? 700 : 400,
                                        color: form.processing_mode === 'instant' ? palette.success : 'text.secondary',
                                        fontSize: '0.8rem',
                                    }}>
                                        Instant
                                    </Typography>
                                </Box>

                                <Switch
                                    checked={form.processing_mode === 'batch'}
                                    onChange={() => setForm(prev => ({
                                        ...prev,
                                        processing_mode: prev.processing_mode === 'instant' ? 'batch' : 'instant',
                                    }))}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': { color: palette.accentPrimary },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: palette.accentPrimary,
                                        },
                                    }}
                                />

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{
                                        fontSize: 18,
                                        color: form.processing_mode === 'batch' ? palette.accentPrimary : 'text.secondary',
                                    }} />
                                    <Typography variant="body2" sx={{
                                        fontWeight: form.processing_mode === 'batch' ? 700 : 400,
                                        color: form.processing_mode === 'batch' ? palette.accentPrimary : 'text.secondary',
                                        fontSize: '0.8rem',
                                    }}>
                                        Scheduled
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Instant info */}
                            {form.processing_mode === 'instant' && (
                                <Box sx={{
                                    p: 1.5, borderRadius: 1,
                                    backgroundColor: alpha(palette.success, 0.06),
                                    border: `1px solid ${alpha(palette.success, 0.2)}`,
                                }}>
                                    <Typography variant="caption" sx={{ color: palette.success, fontWeight: 600 }}>
                                        ⚡ File Sense Active
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                        SWIFT files will be automatically detected and processed as soon as they arrive.
                                    </Typography>
                                </Box>
                            )}

                            {/* Scheduled slider */}
                            {form.processing_mode === 'batch' && (
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Processing interval
                                        </Typography>
                                        <Chip
                                            label={formatMinutes(form.batch_interval_minutes)}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontFamily: '"JetBrains Mono", monospace',
                                                fontSize: '0.7rem', fontWeight: 700,
                                                backgroundColor: alpha(palette.accentPrimary, 0.15),
                                                color: palette.accentPrimary,
                                            }}
                                        />
                                    </Box>
                                    <Slider
                                        value={form.batch_interval_minutes}
                                        onChange={(e, val) => setForm(prev => ({ ...prev, batch_interval_minutes: val }))}
                                        min={1} max={1440} step={1}
                                        marks={[
                                            { value: 1, label: '1m' },
                                            { value: 60, label: '1h' },
                                            { value: 360, label: '6h' },
                                            { value: 720, label: '12h' },
                                            { value: 1440, label: '24h' },
                                        ]}
                                        sx={{
                                            color: palette.accentPrimary,
                                            '& .MuiSlider-markLabel': {
                                                fontFamily: '"JetBrains Mono", monospace',
                                                fontSize: '0.6rem', color: 'text.secondary',
                                            },
                                            '& .MuiSlider-thumb': { width: 16, height: 16 },
                                        }}
                                    />
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ borderColor: alpha(palette.accentPrimary, 0.12) }} />

                        {/* Message Type Selector */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: palette.textPrimary }}>
                                    Message Types
                                </Typography>
                                <FormControlLabel
                                    control={<Switch size="small" checked={form.selectAll} onChange={handleToggleSelectAll}
                                        sx={{
                                            '& .MuiSwitch-switchBase.Mui-checked': { color: palette.accentPrimary },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                backgroundColor: alpha(palette.accentPrimary, 0.5),
                                            },
                                        }} />}
                                    label={<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: palette.textPrimary }}>Select All</Typography>}
                                />
                            </Box>

                            {/* MT types */}
                            <Box sx={{
                                p: 1.5, borderRadius: 1.5, mb: 1.5,
                                border: `1px solid ${alpha('#FF9800', 0.15)}`,
                                backgroundColor: alpha('#FF9800', 0.03),
                            }}>
                                <Typography sx={{
                                    fontSize: '0.65rem', fontWeight: 700, color: '#FF9800',
                                    textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5,
                                }}>
                                    ● MT (FIN Messages)
                                </Typography>
                                <FormGroup row sx={{ gap: 0 }}>
                                    {types.MT?.map(t => (
                                        <FormControlLabel key={t.code}
                                            control={<Checkbox size="small"
                                                checked={form.message_types.includes(t.code)}
                                                onChange={() => handleToggleType(t.code)}
                                                sx={{ py: 0.2, '&.Mui-checked': { color: '#FF9800' } }}
                                            />}
                                            label={
                                                <Typography sx={{ fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace', color: palette.textPrimary }}>
                                                    {t.code} <span style={{ color: alpha(palette.textPrimary, 0.35), fontWeight: 400, fontFamily: 'inherit', fontSize: '0.55rem' }}>— {t.desc}</span>
                                                </Typography>
                                            }
                                            sx={{ mr: 0, width: '50%' }}
                                        />
                                    ))}
                                </FormGroup>
                            </Box>

                            {/* MX types */}
                            <Box sx={{
                                p: 1.5, borderRadius: 1.5,
                                border: `1px solid ${alpha('#4FC3F7', 0.15)}`,
                                backgroundColor: alpha('#4FC3F7', 0.03),
                            }}>
                                <Typography sx={{
                                    fontSize: '0.65rem', fontWeight: 700, color: '#4FC3F7',
                                    textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5,
                                }}>
                                    ● MX (ISO 20022 XML Messages)
                                </Typography>
                                <FormGroup row sx={{ gap: 0 }}>
                                    {types.MX?.map(t => (
                                        <FormControlLabel key={t.code}
                                            control={<Checkbox size="small"
                                                checked={form.message_types.includes(t.code)}
                                                onChange={() => handleToggleType(t.code)}
                                                sx={{ py: 0.2, '&.Mui-checked': { color: '#4FC3F7' } }}
                                            />}
                                            label={
                                                <Typography sx={{ fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace', color: palette.textPrimary }}>
                                                    {t.code} <span style={{ color: alpha(palette.textPrimary, 0.35), fontWeight: 400, fontFamily: 'inherit', fontSize: '0.55rem' }}>— {t.desc}</span>
                                                </Typography>
                                            }
                                            sx={{ mr: 0, width: '50%' }}
                                        />
                                    ))}
                                </FormGroup>
                            </Box>

                            <Box sx={{
                                mt: 1.5, px: 1.5, py: 0.8, borderRadius: 1,
                                backgroundColor: alpha(palette.accentPrimary, 0.06),
                                border: `1px solid ${alpha(palette.accentPrimary, 0.1)}`,
                            }}>
                                <Typography sx={{ fontSize: '0.65rem', color: palette.accentPrimary, fontWeight: 600 }}>
                                    {form.selectAll
                                        ? '✓ All message types selected'
                                        : `${form.message_types.length} type(s) selected`}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(palette.border, 0.3)}` }}>
                    <Button onClick={() => setDialogOpen(false)}
                        sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem',
                            '&:hover': { backgroundColor: alpha(palette.border, 0.15) } }}>
                        Cancel
                    </Button>
                    <Button variant="contained" startIcon={<SaveIcon />}
                        onClick={handleSave} disabled={!form.name.trim()}
                        sx={{
                            backgroundColor: palette.accentPrimary, color: '#000',
                            fontWeight: 700, fontSize: '0.8rem', px: 3,
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                            '&.Mui-disabled': {
                                backgroundColor: alpha(palette.accentPrimary, 0.3),
                                color: alpha('#000', 0.5),
                            },
                        }}>
                        {editPkg ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { backgroundColor: palette.bgSecondary, border: `1px solid ${palette.border}` } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Package?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Remove <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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
