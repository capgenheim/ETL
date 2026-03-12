import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Select,
    MenuItem,
    FormControl,
    Button,
    Chip,
    Snackbar,
    Alert,
    Fade,
    Breadcrumbs,
    Link,
    Divider,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowForward as ArrowIcon,
    CheckCircle as MappedIcon,
    Warning as UnmappedIcon,
    NavigateNext as NavIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

/* ─── Mapping Row ────────────────────────────────────────────── */
function MappingRow({ canvasHeader, sourceHeaders, value, onChange, index }) {
    const isMapped = !!value;

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 60px 1fr 40px',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${palette.border}`,
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.03) },
            }}
        >
            {/* Row Number */}
            <Typography
                sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    textAlign: 'center',
                }}
            >
                {String(index).padStart(2, '0')}
            </Typography>

            {/* Canvas Header (Target) */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    backgroundColor: alpha(palette.bgElevated, 0.5),
                    border: `1px solid ${alpha(palette.accentPrimary, 0.2)}`,
                }}
            >
                <Chip
                    label="OUT"
                    size="small"
                    sx={{
                        height: 18,
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        backgroundColor: alpha(palette.accentPrimary, 0.15),
                        color: palette.accentPrimary,
                        '& .MuiChip-label': { px: 0.5 },
                    }}
                />
                <Typography
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: palette.textPrimary,
                    }}
                >
                    {canvasHeader}
                </Typography>
            </Box>

            {/* Arrow */}
            <Box sx={{ textAlign: 'center' }}>
                <ArrowIcon
                    sx={{
                        fontSize: 20,
                        color: isMapped ? palette.success : palette.textDisabled,
                        transform: 'rotate(180deg)',
                        transition: 'color 0.2s',
                    }}
                />
            </Box>

            {/* Source Header Dropdown */}
            <FormControl fullWidth size="small">
                <Select
                    value={value || ''}
                    onChange={(e) => onChange(canvasHeader, e.target.value)}
                    displayEmpty
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.8rem',
                        height: 36,
                        backgroundColor: alpha(palette.bgSurface, 0.6),
                        '& fieldset': { borderColor: isMapped ? alpha(palette.success, 0.3) : palette.border },
                        '&:hover fieldset': { borderColor: palette.accentPrimary },
                    }}
                >
                    <MenuItem value="" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>
                        — Not mapped —
                    </MenuItem>
                    {sourceHeaders.map((h) => (
                        <MenuItem
                            key={h}
                            value={h}
                            sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}
                        >
                            {h}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Status indicator */}
            <Box sx={{ textAlign: 'center' }}>
                {isMapped ? (
                    <Tooltip title="Mapped">
                        <MappedIcon sx={{ fontSize: 18, color: palette.success }} />
                    </Tooltip>
                ) : (
                    <Tooltip title="Unmapped">
                        <UnmappedIcon sx={{ fontSize: 18, color: palette.warning }} />
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function PackageMappingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pkg, setPkg] = useState(null);
    const [mappings, setMappings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchData = useCallback(async () => {
        try {
            const [pkgRes, mapRes] = await Promise.all([
                api.get(`/transformation/packages/${id}/`),
                api.get(`/transformation/packages/${id}/mappings/`),
            ]);
            setPkg(pkgRes.data);

            // Build initial mappings from existing data
            const existing = {};
            mapRes.data.forEach((m) => {
                existing[m.canvas_header] = m.source_header;
            });
            setMappings(existing);
        } catch {
            setSnackbar({ open: true, message: 'Failed to load package data', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMappingChange = (canvasHeader, sourceHeader) => {
        setMappings((prev) => ({
            ...prev,
            [canvasHeader]: sourceHeader,
        }));
    };

    const handleSave = async () => {
        const mapped = Object.entries(mappings)
            .filter(([, src]) => src)
            .map(([canvas_header, source_header], idx) => ({
                canvas_header,
                source_header,
                order: idx,
            }));

        if (mapped.length === 0) {
            setSnackbar({ open: true, message: 'Please map at least one field', severity: 'warning' });
            return;
        }

        setSaving(true);
        try {
            await api.post(`/transformation/packages/${id}/mappings/`, mapped);
            setSnackbar({ open: true, message: 'Field mappings saved successfully', severity: 'success' });
            setTimeout(() => navigate('/transformation/package-list'), 800);
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.response?.data?.error || 'Failed to save mappings',
                severity: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: palette.accentPrimary }} />
            </Box>
        );
    }

    if (!pkg) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">Package not found.</Typography>
            </Box>
        );
    }

    const canvasHeaders = pkg.canvas_headers || [];
    const sourceHeaders = pkg.source_headers || [];
    const mappedCount = Object.values(mappings).filter(Boolean).length;

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
            {/* Breadcrumb */}
            <Breadcrumbs
                separator={<NavIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                sx={{ mb: 2 }}
            >
                <Link
                    component={RouterLink}
                    to="/transformation/package-list"
                    underline="hover"
                    sx={{
                        color: 'text.secondary',
                        fontSize: '0.8rem',
                        '&:hover': { color: palette.accentPrimary },
                    }}
                >
                    Package List
                </Link>
                <Typography
                    sx={{
                        color: palette.accentPrimary,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                    }}
                >
                    {pkg.name}
                </Typography>
                <Typography sx={{ color: palette.textPrimary, fontSize: '0.8rem', fontWeight: 600 }}>
                    Field Mapping
                </Typography>
            </Breadcrumbs>

            {/* Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        Field Mapping
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Map source columns to canvas output columns for <strong>{pkg.name}</strong>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                        label={`${mappedCount} / ${canvasHeaders.length} mapped`}
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            height: 28,
                            backgroundColor: mappedCount === canvasHeaders.length
                                ? alpha(palette.success, 0.12)
                                : alpha(palette.warning, 0.12),
                            color: mappedCount === canvasHeaders.length ? palette.success : palette.warning,
                            border: `1px solid ${mappedCount === canvasHeaders.length ? alpha(palette.success, 0.3) : alpha(palette.warning, 0.3)}`,
                        }}
                    />
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
                        {saving ? 'Saving...' : 'Save Mapping'}
                    </Button>
                </Box>
            </Box>

            {/* Info Bar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        p: 2,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 1.5,
                        backgroundColor: alpha(palette.bgPrimary, 0.5),
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        SOURCE FILE
                    </Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                        {pkg.source_file_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {sourceHeaders.length} headers
                    </Typography>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        p: 2,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 1.5,
                        backgroundColor: alpha(palette.bgPrimary, 0.5),
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        CANVAS FILE
                    </Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                        {pkg.canvas_file_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {canvasHeaders.length} headers
                    </Typography>
                </Paper>
            </Box>

            {/* Mapping Table */}
            <Paper
                elevation={0}
                sx={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    backgroundColor: alpha(palette.bgPrimary, 0.5),
                }}
            >
                {/* Column Headers */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 60px 1fr 40px',
                        gap: 2,
                        px: 2,
                        py: 1,
                        borderBottom: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.3),
                    }}
                >
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>#</Typography>
                    <Typography sx={headerCellSx}>Canvas (Output)</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}></Typography>
                    <Typography sx={headerCellSx}>Source (Input)</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>✓</Typography>
                </Box>

                {/* Mapping Rows */}
                {canvasHeaders.length > 0 ? (
                    canvasHeaders.map((header, idx) => (
                        <MappingRow
                            key={header}
                            canvasHeader={header}
                            sourceHeaders={sourceHeaders}
                            value={mappings[header]}
                            onChange={handleMappingChange}
                            index={idx + 1}
                        />
                    ))
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No canvas headers found. Please check the canvas file.
                        </Typography>
                    </Box>
                )}

                {/* Footer */}
                <Box
                    sx={{
                        px: 2, py: 1,
                        borderTop: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.3),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
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
                        FIELD MAPPING
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                        }}
                    >
                        {mappedCount} of {canvasHeaders.length} fields mapped
                    </Typography>
                </Box>
            </Paper>

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
