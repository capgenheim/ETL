import { useState } from 'react';
import { useSnackbar } from 'notistack';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    Chip,
    LinearProgress,
    Collapse,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    InsertDriveFile as FileIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Save as SaveIcon,
    CheckCircle as SuccessIcon,
    Description as CsvIcon,
    TableChart as XlsxIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

const ACCEPTED_FORMATS = '.xlsx,.xls,.csv';
const FORMAT_LABELS = {
    xlsx: { label: 'XLSX', color: '#217346' },
    xls: { label: 'XLS', color: '#1D6F42' },
    csv: { label: 'CSV', color: '#F59E0B' },
};

/* ─── Drop Zone Component ─────────────────────────────────────────── */
function DropZone({ onFilesSelected, fileType }) {
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => {
            const ext = f.name.split('.').pop().toLowerCase();
            return ['xlsx', 'xls', 'csv'].includes(ext);
        });
        if (files.length) onFilesSelected(files);
    }, [onFilesSelected]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    return (
        <Paper
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOver(false)}
            sx={{
                p: 4,
                textAlign: 'center',
                border: `2px dashed ${dragOver ? palette.accentPrimary : palette.border}`,
                backgroundColor: dragOver
                    ? alpha(palette.accentPrimary, 0.06)
                    : alpha(palette.bgSecondary, 0.5),
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                    borderColor: palette.accentPrimary,
                    backgroundColor: alpha(palette.accentPrimary, 0.04),
                },
            }}
            onClick={() => document.getElementById(`file-input-${fileType}`).click()}
        >
            <input
                id={`file-input-${fileType}`}
                type="file"
                multiple
                accept={ACCEPTED_FORMATS}
                style={{ display: 'none' }}
                onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length) onFilesSelected(files);
                    e.target.value = '';
                }}
            />
            <UploadIcon
                sx={{
                    fontSize: 48,
                    color: dragOver ? palette.accentPrimary : 'text.secondary',
                    mb: 1.5,
                    transition: 'color 0.2s',
                }}
            />
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Drop files here or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Supports: XLSX, XLS (97-2003), CSV • Multiple files allowed
            </Typography>
        </Paper>
    );
}

/* ─── File Card Component ─────────────────────────────────────────── */
function FileCard({ file, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const fmt = FORMAT_LABELS[file.file_format] || { label: file.file_format, color: '#888' };

    return (
        <Paper
            sx={{
                p: 0,
                backgroundColor: palette.bgSecondary,
                border: `1px solid ${palette.border}`,
                borderRadius: 1.5,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: alpha(palette.accentPrimary, 0.4) },
            }}
        >
            {/* Header Row */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    gap: 1.5,
                    cursor: 'pointer',
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(fmt.color, 0.12),
                        flexShrink: 0,
                    }}
                >
                    {file.file_format === 'csv' ? (
                        <CsvIcon sx={{ fontSize: 20, color: fmt.color }} />
                    ) : (
                        <XlsxIcon sx={{ fontSize: 20, color: fmt.color }} />
                    )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {file.original_filename}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Chip
                            label={fmt.label}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: alpha(fmt.color, 0.15),
                                color: fmt.color,
                                '& .MuiChip-label': { px: 0.75 },
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {file.field_count} field{file.field_count !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>

                <Tooltip title="Delete file">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(file.id);
                        }}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { color: palette.error, backgroundColor: alpha(palette.error, 0.08) },
                        }}
                    >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>

                {expanded ? (
                    <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                ) : (
                    <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                )}
            </Box>

            {/* Expandable Headers List */}
            <Collapse in={expanded}>
                <Divider />
                <Box sx={{ p: 1.5, pt: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}
                    >
                        CAPTURED FIELDS
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {file.headers_json.map((header, idx) => (
                            <Chip
                                key={idx}
                                label={header}
                                size="small"
                                variant="outlined"
                                sx={{
                                    height: 24,
                                    fontSize: '0.75rem',
                                    borderColor: alpha(palette.accentPrimary, 0.3),
                                    color: palette.textPrimary,
                                    '& .MuiChip-label': { px: 1 },
                                }}
                            />
                        ))}
                        {file.headers_json.length === 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No headers found
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Collapse>
        </Paper>
    );
}

/* ─── Upload Panel Component ──────────────────────────────────────── */
function UploadPanel({ title, fileType, files, onFilesSelected, onDelete, uploading }) {
    return (
        <Paper
            elevation={0}
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: alpha(palette.bgPrimary, 0.5),
                border: `1px solid ${palette.border}`,
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            {/* Panel Header */}
            <Box
                sx={{
                    p: 2,
                    pb: 1.5,
                    borderBottom: `1px solid ${palette.border}`,
                    backgroundColor: alpha(palette.bgSecondary, 0.4),
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Upload files to extract column headers
                </Typography>
            </Box>

            {/* Upload zone */}
            <Box sx={{ p: 2 }}>
                <DropZone onFilesSelected={onFilesSelected} fileType={fileType} />
            </Box>

            {/* Loading indicator */}
            {uploading && (
                <Box sx={{ px: 2 }}>
                    <LinearProgress
                        sx={{
                            borderRadius: 1,
                            backgroundColor: alpha(palette.accentPrimary, 0.12),
                            '& .MuiLinearProgress-bar': { backgroundColor: palette.accentPrimary },
                        }}
                    />
                </Box>
            )}

            {/* File cards */}
            <Box sx={{ p: 2, pt: 1, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {files.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} uploaded
                    </Typography>
                )}
                {files.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={onDelete} />
                ))}
            </Box>
        </Paper>
    );
}

/* ─── Main Upload Section Page ────────────────────────────────────── */
export default function UploadSectionPage() {
    const [sourceFiles, setSourceFiles] = useState([]);
    const [canvasFiles, setCanvasFiles] = useState([]);
    const [uploadingSource, setUploadingSource] = useState(false);
    const [uploadingCanvas, setUploadingCanvas] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const showMessage = (message, severity = 'success') => {
        enqueueSnackbar(message, { variant: severity });
    };

    /* Upload files to backend */
    const handleUpload = async (files, fileType) => {
        const setUploading = fileType === 'source' ? setUploadingSource : setUploadingCanvas;
        const setFiles = fileType === 'source' ? setSourceFiles : setCanvasFiles;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file_type', fileType);
            files.forEach((f) => formData.append('files', f));

            const response = await api.post('/transformation/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.uploaded?.length) {
                setFiles((prev) => [...response.data.uploaded, ...prev]);
                showMessage(
                    `${response.data.uploaded.length} file${response.data.uploaded.length > 1 ? 's' : ''} uploaded — headers extracted`,
                    'success'
                );
            }
            if (response.data.errors?.length) {
                const errMsg = response.data.errors.map((e) => `${e.filename}: ${e.error}`).join('; ');
                showMessage(errMsg, 'warning');
            }
        } catch (err) {
            showMessage(err.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    /* Delete a file */
    const handleDelete = async (fileId, fileType) => {
        try {
            await api.delete(`/transformation/files/${fileId}/`);
            const setFiles = fileType === 'source' ? setSourceFiles : setCanvasFiles;
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            showMessage('File removed');
        } catch {
            showMessage('Failed to delete file', 'error');
        }
    };

    /* Save — clear staging area */
    const handleSave = () => {
        if (sourceFiles.length === 0 && canvasFiles.length === 0) {
            showMessage('No files to save', 'warning');
            return;
        }
        setSourceFiles([]);
        setCanvasFiles([]);
        showMessage('Files saved successfully');
    };

    return (
        <Box>
            {/* Page Header with Save Button */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        Upload Section
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Upload source and canvas files to extract column headers for transformation mapping
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={sourceFiles.length === 0 && canvasFiles.length === 0}
                    sx={{
                        px: 3,
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        backgroundColor: palette.accentPrimary,
                        '&:hover': {
                            backgroundColor: alpha(palette.accentPrimary, 0.85),
                        },
                        boxShadow: `0 2px 8px ${alpha(palette.accentPrimary, 0.3)}`,
                    }}
                >
                    Save
                </Button>
            </Box>

            {/* Dual Panel Layout */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 3,
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'flex-start',
                }}
            >
                <UploadPanel
                    title="Source File"
                    fileType="source"
                    files={sourceFiles}
                    onFilesSelected={(f) => handleUpload(f, 'source')}
                    onDelete={(id) => handleDelete(id, 'source')}
                    uploading={uploadingSource}
                />

                {/* Vertical Divider */}
                <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        borderColor: palette.border,
                    }}
                />

                <UploadPanel
                    title="Canvas File"
                    fileType="canvas"
                    files={canvasFiles}
                    onFilesSelected={(f) => handleUpload(f, 'canvas')}
                    onDelete={(id) => handleDelete(id, 'canvas')}
                    uploading={uploadingCanvas}
                />
            </Box>


        </Box>
    );
}
