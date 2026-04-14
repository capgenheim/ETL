import { useState, useCallback } from 'react';
import {
    Box, Typography, Paper, Button, IconButton, Chip, LinearProgress,
    Collapse, Divider, Tooltip, Alert, Fade, Stack, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Description as CsvIcon,
    TableChart as XlsxIcon,
    AutoFixHigh as AutoIcon,
    AccountTree as SegregateIcon,
    Refresh as RefreshIcon,
    FolderSpecial as FolderIcon,
    Speed as SpeedIcon,
    Inventory as InventoryIcon,
    PlayArrow as RunIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

const FORMAT_LABELS = {
    xlsx: { label: 'XLSX', color: '#217346' },
    xls: { label: 'XLS', color: '#1D6F42' },
    csv: { label: 'CSV', color: '#F59E0B' },
    fin: { label: 'FIN', color: '#40c4ff' },
    xml: { label: 'XML', color: '#E91E63' },
    unknown: { label: 'FILE', color: '#9aa0a6' },
};

const SEGREGATION_TARGETS = [
    { value: 'transformation', label: 'Transformation Inbound', dir: 'trfm_inbound', color: palette.accentPrimary },
    { value: 'swift', label: 'SWIFT Inbound', dir: 'sft_inbound', color: palette.info },
];

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ title, value, icon: Icon, color }) {
    return (
        <Paper
            sx={{
                p: 2, flex: 1, minWidth: 160,
                background: `linear-gradient(135deg, ${alpha(color, 0.10)} 0%, ${alpha(color, 0.03)} 100%)`,
                border: `1px solid ${alpha(color, 0.20)}`,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                    border: `1px solid ${alpha(color, 0.40)}`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 20px ${alpha(color, 0.15)}`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="overline" sx={{ color: palette.textSecondary, fontSize: '0.6rem' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color, mt: 0.5 }}>
                        {value}
                    </Typography>
                </Box>
                <Icon sx={{ fontSize: 32, color: alpha(color, 0.4) }} />
            </Box>
        </Paper>
    );
}

/* ─── Drop Zone ─────────────────────────────────────────────────── */
function DropZone({ onFilesSelected }) {
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFilesSelected(files);
    }, [onFilesSelected]);

    return (
        <Paper
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            sx={{
                p: 4, textAlign: 'center',
                border: `2px dashed ${dragOver ? palette.accentPrimary : palette.border}`,
                backgroundColor: dragOver ? alpha(palette.accentPrimary, 0.06) : alpha(palette.bgSecondary, 0.5),
                borderRadius: 2, cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                    borderColor: palette.accentPrimary,
                    backgroundColor: alpha(palette.accentPrimary, 0.04),
                },
            }}
            onClick={() => document.getElementById('segregation-file-input').click()}
        >
            <input
                id="segregation-file-input"
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length) onFilesSelected(files);
                    e.target.value = '';
                }}
            />
            <UploadIcon
                sx={{
                    fontSize: 52, mb: 1.5,
                    color: dragOver ? palette.accentPrimary : 'text.secondary',
                    transition: 'color 0.2s',
                }}
            />
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Drop files here or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Supports all file types • Auto-detects SWIFT (FIN/XML) and Transformation (CSV/XLS/XLSX) files
            </Typography>
        </Paper>
    );
}

/* ─── Auto-detect target based on file extension ────────────────── */
function detectTarget(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['fin', 'mt', 'swi'].includes(ext)) return 'swift';
    if (['xml'].includes(ext)) {
        // XML could be MX/pacs messages
        if (/pacs|camt|pain|sese/i.test(filename)) return 'swift';
        return 'transformation';
    }
    if (['csv', 'xls', 'xlsx', 'tsv', 'txt'].includes(ext)) return 'transformation';
    return 'transformation'; // default
}

function getFileExt(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return FORMAT_LABELS[ext] || FORMAT_LABELS.unknown;
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function UploadSegregationPage() {
    const [stagedFiles, setStagedFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const [alert, setAlert] = useState(null);

    // Add files to staging area with auto-detected targets
    const handleFilesSelected = (files) => {
        const newEntries = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            name: file.name,
            size: file.size,
            target: detectTarget(file.name),
            status: 'staged', // staged | uploading | success | failed
            error: null,
        }));
        setStagedFiles((prev) => [...prev, ...newEntries]);
    };

    // Change target for a file
    const handleTargetChange = (id, target) => {
        setStagedFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, target } : f))
        );
    };

    // Remove a staged file
    const handleRemove = (id) => {
        setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    };

    // Clear all staged files
    const handleClearAll = () => {
        setStagedFiles([]);
        setResults([]);
        setAlert(null);
    };

    // Process: upload each file to its target directory via API
    const handleProcess = async () => {
        if (stagedFiles.length === 0) return;
        setProcessing(true);
        setResults([]);

        const processResults = [];

        for (const entry of stagedFiles) {
            // Mark as uploading
            setStagedFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' } : f))
            );

            try {
                const formData = new FormData();
                formData.append('file', entry.file);
                formData.append('target', entry.target);

                await api.post('/dashboard/upload-segregate/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                setStagedFiles((prev) =>
                    prev.map((f) => (f.id === entry.id ? { ...f, status: 'success' } : f))
                );
                processResults.push({ name: entry.name, target: entry.target, status: 'success' });
            } catch (err) {
                const errorMsg = err.response?.data?.error || 'Upload failed';
                setStagedFiles((prev) =>
                    prev.map((f) => (f.id === entry.id ? { ...f, status: 'failed', error: errorMsg } : f))
                );
                processResults.push({ name: entry.name, target: entry.target, status: 'failed', error: errorMsg });
            }
        }

        setResults(processResults);
        setProcessing(false);

        const successCount = processResults.filter((r) => r.status === 'success').length;
        const failCount = processResults.filter((r) => r.status === 'failed').length;

        if (failCount === 0) {
            setAlert({ severity: 'success', message: `All ${successCount} file(s) segregated successfully.` });
        } else if (successCount === 0) {
            setAlert({ severity: 'error', message: `All ${failCount} file(s) failed to process.` });
        } else {
            setAlert({ severity: 'warning', message: `${successCount} succeeded, ${failCount} failed.` });
        }
    };

    const trfmCount = stagedFiles.filter((f) => f.target === 'transformation').length;
    const swiftCount = stagedFiles.filter((f) => f.target === 'swift').length;
    const successCount = stagedFiles.filter((f) => f.status === 'success').length;

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        Segregation Automation Engine
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Upload files and auto-route them to the correct processing pipeline
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Clear all">
                        <span>
                            <IconButton
                                onClick={handleClearAll}
                                disabled={stagedFiles.length === 0}
                                sx={{
                                    border: `1px solid ${palette.border}`,
                                    color: palette.textSecondary,
                                    '&:hover': { color: palette.error, backgroundColor: alpha(palette.error, 0.08) },
                                }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<RunIcon />}
                        onClick={handleProcess}
                        disabled={stagedFiles.length === 0 || processing || stagedFiles.every((f) => f.status === 'success')}
                        sx={{
                            px: 3, fontWeight: 600, textTransform: 'none',
                            backgroundColor: palette.accentPrimary,
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                            boxShadow: `0 2px 8px ${alpha(palette.accentPrimary, 0.3)}`,
                        }}
                    >
                        {processing ? 'Processing...' : 'Process & Segregate'}
                    </Button>
                </Stack>
            </Box>

            {/* Alert */}
            {alert && (
                <Fade in>
                    <Alert
                        severity={alert.severity}
                        onClose={() => setAlert(null)}
                        sx={{ mb: 2, borderRadius: 2 }}
                    >
                        {alert.message}
                    </Alert>
                </Fade>
            )}

            {/* Summary Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <StatCard title="Total Staged" value={stagedFiles.length} icon={InventoryIcon} color={palette.info} />
                <StatCard title="→ Transformation" value={trfmCount} icon={SegregateIcon} color={palette.accentPrimary} />
                <StatCard title="→ SWIFT" value={swiftCount} icon={SpeedIcon} color="#40c4ff" />
                <StatCard title="Processed" value={successCount} icon={SuccessIcon} color={palette.success} />
            </Stack>

            {/* Drop Zone */}
            <Box sx={{ mb: 3 }}>
                <DropZone onFilesSelected={handleFilesSelected} />
            </Box>

            {/* Processing Progress */}
            {processing && (
                <LinearProgress
                    sx={{
                        mb: 2, borderRadius: 1,
                        backgroundColor: alpha(palette.accentPrimary, 0.12),
                        '& .MuiLinearProgress-bar': { backgroundColor: palette.accentPrimary },
                    }}
                />
            )}

            {/* Staged Files Table */}
            {stagedFiles.length > 0 && (
                <Paper
                    sx={{
                        backgroundColor: palette.bgSecondary,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 2, overflow: 'hidden',
                    }}
                >
                    {/* Table Header */}
                    <Box
                        sx={{
                            px: 2.5, py: 1.5,
                            borderBottom: `1px solid ${palette.border}`,
                            backgroundColor: alpha(palette.bgElevated, 0.5),
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AutoIcon sx={{ fontSize: 18, color: palette.accentPrimary }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                Staging Area
                            </Typography>
                            <Chip
                                label={`${stagedFiles.length} file${stagedFiles.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                    height: 22, fontSize: '0.7rem', fontWeight: 600,
                                    backgroundColor: alpha(palette.info, 0.12),
                                    color: palette.info,
                                }}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            Auto-detected targets • Override as needed
                        </Typography>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['File', 'Size', 'Detected Target', 'Status', ''].map((h) => (
                                        <TableCell
                                            key={h}
                                            sx={{
                                                fontWeight: 700, fontSize: '0.72rem',
                                                color: palette.textSecondary,
                                                backgroundColor: palette.bgElevated,
                                                borderBottom: `1px solid ${palette.border}`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em', py: 1.2,
                                            }}
                                        >
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stagedFiles.map((entry) => {
                                    const fmt = getFileExt(entry.name);
                                    const targetInfo = SEGREGATION_TARGETS.find((t) => t.value === entry.target);
                                    const isProcessed = entry.status === 'success' || entry.status === 'failed';

                                    return (
                                        <TableRow
                                            key={entry.id}
                                            sx={{
                                                transition: 'background-color 0.15s',
                                                '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.04) },
                                                '& td': { borderBottom: `1px solid ${palette.divider}`, py: 1 },
                                                ...(entry.status === 'success' && {
                                                    backgroundColor: alpha(palette.success, 0.04),
                                                }),
                                                ...(entry.status === 'failed' && {
                                                    backgroundColor: alpha(palette.error, 0.04),
                                                }),
                                            }}
                                        >
                                            {/* File */}
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box
                                                        sx={{
                                                            width: 32, height: 32, borderRadius: 1,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            backgroundColor: alpha(fmt.color, 0.12), flexShrink: 0,
                                                        }}
                                                    >
                                                        {['csv', 'tsv', 'txt'].includes(entry.name.split('.').pop().toLowerCase()) ? (
                                                            <CsvIcon sx={{ fontSize: 18, color: fmt.color }} />
                                                        ) : (
                                                            <XlsxIcon sx={{ fontSize: 18, color: fmt.color }} />
                                                        )}
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                                            {entry.name}
                                                        </Typography>
                                                        <Chip
                                                            label={fmt.label}
                                                            size="small"
                                                            sx={{
                                                                height: 16, fontSize: '0.6rem', fontWeight: 700,
                                                                backgroundColor: alpha(fmt.color, 0.15),
                                                                color: fmt.color, mt: 0.3,
                                                                '& .MuiChip-label': { px: 0.5 },
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </TableCell>

                                            {/* Size */}
                                            <TableCell>
                                                <Typography variant="caption" sx={{ fontFamily: '"Roboto Mono", monospace', color: palette.textSecondary }}>
                                                    {formatSize(entry.size)}
                                                </Typography>
                                            </TableCell>

                                            {/* Target */}
                                            <TableCell>
                                                {isProcessed ? (
                                                    <Chip
                                                        icon={<FolderIcon sx={{ fontSize: 14 }} />}
                                                        label={targetInfo?.label || entry.target}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 600, fontSize: '0.72rem',
                                                            backgroundColor: alpha(targetInfo?.color || palette.info, 0.12),
                                                            color: targetInfo?.color || palette.info,
                                                            border: `1px solid ${alpha(targetInfo?.color || palette.info, 0.25)}`,
                                                            '& .MuiChip-icon': { color: targetInfo?.color || palette.info },
                                                        }}
                                                    />
                                                ) : (
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={entry.target}
                                                        onChange={(e) => handleTargetChange(entry.id, e.target.value)}
                                                        sx={{
                                                            minWidth: 200,
                                                            '& .MuiOutlinedInput-root': {
                                                                fontSize: '0.8rem',
                                                                backgroundColor: alpha(palette.bgSurface, 0.3),
                                                            },
                                                        }}
                                                    >
                                                        {SEGREGATION_TARGETS.map((t) => (
                                                            <MenuItem key={t.value} value={t.value}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.color }} />
                                                                    {t.label}
                                                                </Box>
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                )}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                {entry.status === 'staged' && (
                                                    <Chip label="Staged" size="small" variant="outlined"
                                                        sx={{ fontSize: '0.7rem', borderColor: palette.border, color: palette.textSecondary }}
                                                    />
                                                )}
                                                {entry.status === 'uploading' && (
                                                    <Chip label="Processing..." size="small"
                                                        sx={{
                                                            fontSize: '0.7rem', fontWeight: 600,
                                                            backgroundColor: alpha(palette.warning, 0.12),
                                                            color: palette.warning,
                                                            animation: 'pulse 1.5s ease-in-out infinite',
                                                            '@keyframes pulse': {
                                                                '0%, 100%': { opacity: 1 },
                                                                '50%': { opacity: 0.5 },
                                                            },
                                                        }}
                                                    />
                                                )}
                                                {entry.status === 'success' && (
                                                    <Chip
                                                        icon={<SuccessIcon sx={{ fontSize: 14 }} />}
                                                        label="Segregated"
                                                        size="small"
                                                        sx={{
                                                            fontSize: '0.7rem', fontWeight: 600,
                                                            backgroundColor: alpha(palette.success, 0.12),
                                                            color: palette.success,
                                                            '& .MuiChip-icon': { color: palette.success },
                                                        }}
                                                    />
                                                )}
                                                {entry.status === 'failed' && (
                                                    <Tooltip title={entry.error || 'Unknown error'} arrow>
                                                        <Chip
                                                            icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                                                            label="Failed"
                                                            size="small"
                                                            sx={{
                                                                fontSize: '0.7rem', fontWeight: 600,
                                                                backgroundColor: alpha(palette.error, 0.12),
                                                                color: palette.error,
                                                                '& .MuiChip-icon': { color: palette.error },
                                                            }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell align="right">
                                                {!isProcessed && (
                                                    <Tooltip title="Remove">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleRemove(entry.id)}
                                                            sx={{
                                                                color: 'text.secondary',
                                                                '&:hover': { color: palette.error, backgroundColor: alpha(palette.error, 0.08) },
                                                            }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Empty State */}
            {stagedFiles.length === 0 && !alert && (
                <Paper
                    sx={{
                        p: 4, textAlign: 'center', mt: 2,
                        backgroundColor: palette.bgSecondary,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 2,
                    }}
                >
                    <SegregateIcon sx={{ fontSize: 48, color: palette.textDisabled, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        No files staged for processing
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                        Upload files above — they'll be auto-detected and routed to the correct inbound directory
                    </Typography>

                    <Divider sx={{ my: 2.5, borderColor: palette.border }} />

                    <Stack direction="row" spacing={3} justifyContent="center">
                        {SEGREGATION_TARGETS.map((t) => (
                            <Box key={t.value} sx={{ textAlign: 'center' }}>
                                <Box
                                    sx={{
                                        width: 44, height: 44, borderRadius: 1.5, mx: 'auto', mb: 0.5,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: alpha(t.color, 0.10),
                                        border: `1px solid ${alpha(t.color, 0.20)}`,
                                    }}
                                >
                                    <FolderIcon sx={{ fontSize: 22, color: t.color }} />
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: t.color, display: 'block' }}>
                                    {t.label}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                    {t.dir}/
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Paper>
            )}
        </Box>
    );
}
