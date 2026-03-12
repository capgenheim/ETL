import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    Slider,
    Button,
    Chip,
    Snackbar,
    Alert,
    Fade,
    Divider,
    InputAdornment,
    FormHelperText,
} from '@mui/material';
import {
    Save as SaveIcon,
    Pattern as PatternIcon,
    Output as OutputIcon,
    Schedule as ScheduleIcon,
    BoltOutlined as InstantIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

const FORMAT_OPTIONS = [
    { value: 'csv', label: 'CSV' },
    { value: 'xlsx', label: 'Excel (XLSX)' },
    { value: 'xls', label: 'Excel 97-2003 (XLS)' },
];

/* ─── Section Header ──────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, subtitle }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                {Icon && <Icon sx={{ fontSize: 18, color: palette.accentPrimary }} />}
                <Typography
                    variant="overline"
                    sx={{
                        color: palette.accentPrimary,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                    }}
                >
                    {title}
                </Typography>
            </Box>
            {subtitle && (
                <Typography variant="caption" color="text.secondary">
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
}

/* ─── Helper: format minutes to readable string ──────────────── */
function formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
    return `${h}h ${m}m`;
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function CreatePackagePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [sourceFiles, setSourceFiles] = useState([]);
    const [canvasFiles, setCanvasFiles] = useState([]);

    const [form, setForm] = useState({
        name: '',
        file_pattern: '',
        source_file: '',
        canvas_file: '',
        input_format: 'csv',
        output_format: 'csv',
        output_prefix: '',
        batch_mode: 'instant',
        batch_interval_minutes: 30,
    });

    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Load source and canvas files + existing package data if editing
    useEffect(() => {
        const loadData = async () => {
            try {
                const [srcRes, canvasRes] = await Promise.all([
                    api.get('/transformation/files/?type=source'),
                    api.get('/transformation/files/?type=canvas'),
                ]);
                setSourceFiles(srcRes.data);
                setCanvasFiles(canvasRes.data);

                // If editing, fetch existing package and populate form
                if (isEditMode) {
                    const pkgRes = await api.get(`/transformation/packages/${id}/`);
                    const pkg = pkgRes.data;
                    setForm({
                        name: pkg.name || '',
                        file_pattern: pkg.file_pattern || '',
                        source_file: pkg.source_file || '',
                        canvas_file: pkg.canvas_file || '',
                        input_format: pkg.input_format || 'csv',
                        output_format: pkg.output_format || 'csv',
                        output_prefix: pkg.output_prefix || '',
                        batch_mode: pkg.batch_mode || 'instant',
                        batch_interval_minutes: pkg.batch_interval_minutes || 30,
                    });
                }
            } catch {
                // silent
            }
        };
        loadData();
    }, [id, isEditMode]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSave = async () => {
        // Validation
        if (!form.name.trim()) {
            setSnackbar({ open: true, message: 'Package name is required', severity: 'warning' });
            return;
        }
        if (!form.file_pattern.trim()) {
            setSnackbar({ open: true, message: 'File pattern is required', severity: 'warning' });
            return;
        }
        if (!form.source_file) {
            setSnackbar({ open: true, message: 'Please select a source file', severity: 'warning' });
            return;
        }
        if (!form.canvas_file) {
            setSnackbar({ open: true, message: 'Please select a canvas file', severity: 'warning' });
            return;
        }
        if (!form.output_prefix.trim()) {
            setSnackbar({ open: true, message: 'Output prefix is required', severity: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                batch_interval_minutes: form.batch_mode === 'scheduled' ? form.batch_interval_minutes : 0,
            };

            if (isEditMode) {
                await api.put(`/transformation/packages/${id}/`, payload);
                setSnackbar({ open: true, message: 'Package updated successfully', severity: 'success' });
                setTimeout(() => navigate('/transformation/package-list'), 500);
            } else {
                const res = await api.post('/transformation/packages/create/', payload);
                setSnackbar({ open: true, message: 'Package created successfully', severity: 'success' });
                setTimeout(() => navigate(`/transformation/packages/${res.data.id}/mapping`), 500);
            }
        } catch (err) {
            const msg = err.response?.data?.detail
                || JSON.stringify(err.response?.data)
                || `Failed to ${isEditMode ? 'update' : 'create'} package`;
            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Live preview
    const now = new Date();
    const previewTimestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const previewFilename = `${form.output_prefix || '<prefix>'}${previewTimestamp}.${form.output_format}`;

    const selectSx = {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.85rem',
        backgroundColor: alpha(palette.bgSurface, 0.6),
        '& fieldset': { borderColor: palette.border },
        '&:hover fieldset': { borderColor: palette.accentPrimary },
    };

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        {isEditMode ? 'Edit Package' : 'Create Package'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {isEditMode
                            ? 'Update the transformation package configuration'
                            : 'Define a transformation package to map source data to canvas output'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        px: 3, py: 1, fontWeight: 600, textTransform: 'none',
                        borderRadius: 1.5,
                        backgroundColor: palette.accentPrimary,
                        '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                        boxShadow: `0 2px 8px ${alpha(palette.accentPrimary, 0.3)}`,
                    }}
                >
                    {saving ? 'Saving...' : isEditMode ? 'Update Package' : 'Save & Map Fields'}
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
                {/* ─── Left Column: Main Config ────────────────────── */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 2,
                        p: 3,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 2,
                        backgroundColor: alpha(palette.bgPrimary, 0.5),
                    }}
                >
                    {/* Package Name */}
                    <SectionHeader title="Package Details" subtitle="Basic package identification" />
                    <TextField
                        fullWidth
                        label="Package Name"
                        placeholder="e.g. MBB Bank Statement Import"
                        value={form.name}
                        onChange={handleChange('name')}
                        sx={{ mb: 3 }}
                    />

                    <Divider sx={{ borderColor: palette.border, my: 2 }} />

                    {/* File Pattern */}
                    <SectionHeader
                        icon={PatternIcon}
                        title="File Pattern"
                        subtitle="Glob pattern to auto-match inbound files to this package"
                    />
                    <TextField
                        fullWidth
                        label="File Pattern"
                        placeholder="e.g. MBB_*.csv"
                        value={form.file_pattern}
                        onChange={handleChange('file_pattern')}
                        helperText="Use * as wildcard. Example: MBB_*.csv matches MBB_jan.csv, MBB_feb.csv"
                        sx={{ mb: 3 }}
                    />

                    <Divider sx={{ borderColor: palette.border, my: 2 }} />

                    {/* Source & Canvas Selection */}
                    <SectionHeader
                        title="Source & Canvas Mapping"
                        subtitle="Select the source file (input schema) and canvas file (output schema)"
                    />

                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth>
                            <InputLabel>Source File</InputLabel>
                            <Select
                                value={form.source_file}
                                onChange={handleChange('source_file')}
                                label="Source File"
                                sx={selectSx}
                            >
                                {sourceFiles.map((f) => (
                                    <MenuItem key={f.id} value={f.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={f.file_format.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    height: 18, fontSize: '0.6rem', fontWeight: 700,
                                                    fontFamily: '"JetBrains Mono", monospace',
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                {f.original_filename}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ({f.field_count} fields)
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Defines input column headers</FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Canvas File</InputLabel>
                            <Select
                                value={form.canvas_file}
                                onChange={handleChange('canvas_file')}
                                label="Canvas File"
                                sx={selectSx}
                            >
                                {canvasFiles.map((f) => (
                                    <MenuItem key={f.id} value={f.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={f.file_format.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    height: 18, fontSize: '0.6rem', fontWeight: 700,
                                                    fontFamily: '"JetBrains Mono", monospace',
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                {f.original_filename}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ({f.field_count} fields)
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Defines output column headers</FormHelperText>
                        </FormControl>
                    </Box>

                    <Divider sx={{ borderColor: palette.border, my: 2 }} />

                    {/* Input/Output Format */}
                    <SectionHeader
                        title="File Formats"
                        subtitle="Expected input format and desired output format"
                    />
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth>
                            <InputLabel>Input Format</InputLabel>
                            <Select
                                value={form.input_format}
                                onChange={handleChange('input_format')}
                                label="Input Format"
                                sx={selectSx}
                            >
                                {FORMAT_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Expected format of inbound source files</FormHelperText>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Output Format</InputLabel>
                            <Select
                                value={form.output_format}
                                onChange={handleChange('output_format')}
                                label="Output Format"
                                sx={selectSx}
                            >
                                {FORMAT_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>Format of the transformed output file</FormHelperText>
                        </FormControl>
                    </Box>
                </Paper>

                {/* ─── Right Column: Output & Batch ────────────────── */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Output Preview */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            border: `1px solid ${palette.border}`,
                            borderRadius: 2,
                            backgroundColor: alpha(palette.bgPrimary, 0.5),
                        }}
                    >
                        <SectionHeader
                            icon={OutputIcon}
                            title="Output Configuration"
                            subtitle="The generated filename will be: prefix + timestamp"
                        />

                        <TextField
                            fullWidth
                            label="Output Prefix"
                            placeholder="e.g. mbbprocess_"
                            value={form.output_prefix}
                            onChange={handleChange('output_prefix')}
                            sx={{ mb: 2 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Chip
                                            label={`.${form.output_format}`}
                                            size="small"
                                            sx={{
                                                height: 20, fontWeight: 700,
                                                fontFamily: '"JetBrains Mono", monospace',
                                                fontSize: '0.65rem',
                                                backgroundColor: alpha(palette.accentPrimary, 0.15),
                                                color: palette.accentPrimary,
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Live Preview */}
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1,
                                backgroundColor: alpha(palette.bgSecondary, 0.8),
                                border: `1px dashed ${palette.border}`,
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    color: 'text.secondary',
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.08em',
                                    display: 'block',
                                    mb: 0.5,
                                }}
                            >
                                ▸ PREVIEW
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                    color: palette.accentPrimary,
                                    fontWeight: 600,
                                    wordBreak: 'break-all',
                                }}
                            >
                                {previewFilename}
                            </Typography>
                        </Box>
                    </Paper>

                    {/* Batch Mode */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            border: `1px solid ${palette.border}`,
                            borderRadius: 2,
                            backgroundColor: alpha(palette.bgPrimary, 0.5),
                        }}
                    >
                        <SectionHeader
                            icon={ScheduleIcon}
                            title="Processing Mode"
                            subtitle="Instant: auto-pickup on file arrival. Scheduled: run at fixed intervals."
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <InstantIcon sx={{
                                    fontSize: 18,
                                    color: form.batch_mode === 'instant' ? palette.success : 'text.secondary',
                                }} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: form.batch_mode === 'instant' ? 700 : 400,
                                        color: form.batch_mode === 'instant' ? palette.success : 'text.secondary',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    Instant
                                </Typography>
                            </Box>

                            <Switch
                                checked={form.batch_mode === 'scheduled'}
                                onChange={() => setForm((prev) => ({
                                    ...prev,
                                    batch_mode: prev.batch_mode === 'instant' ? 'scheduled' : 'instant',
                                }))}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: palette.accentPrimary,
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        backgroundColor: palette.accentPrimary,
                                    },
                                }}
                            />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ScheduleIcon sx={{
                                    fontSize: 18,
                                    color: form.batch_mode === 'scheduled' ? palette.accentPrimary : 'text.secondary',
                                }} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: form.batch_mode === 'scheduled' ? 700 : 400,
                                        color: form.batch_mode === 'scheduled' ? palette.accentPrimary : 'text.secondary',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    Scheduled
                                </Typography>
                            </Box>
                        </Box>

                        {/* Instant mode info */}
                        {form.batch_mode === 'instant' && (
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    backgroundColor: alpha(palette.success, 0.06),
                                    border: `1px solid ${alpha(palette.success, 0.2)}`,
                                }}
                            >
                                <Typography variant="caption" sx={{ color: palette.success, fontWeight: 600 }}>
                                    ⚡ File Sense Active
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                    Files will be automatically detected and processed as soon as they arrive in the inbound directory.
                                </Typography>
                            </Box>
                        )}

                        {/* Scheduled mode slider */}
                        {form.batch_mode === 'scheduled' && (
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
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            backgroundColor: alpha(palette.accentPrimary, 0.15),
                                            color: palette.accentPrimary,
                                        }}
                                    />
                                </Box>
                                <Slider
                                    value={form.batch_interval_minutes}
                                    onChange={(e, val) => setForm((prev) => ({ ...prev, batch_interval_minutes: val }))}
                                    min={1}
                                    max={1440}
                                    step={1}
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
                                            fontSize: '0.6rem',
                                            color: 'text.secondary',
                                        },
                                        '& .MuiSlider-thumb': {
                                            width: 16,
                                            height: 16,
                                        },
                                    }}
                                />
                            </Box>
                        )}
                    </Paper>
                </Box>
            </Box>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
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
