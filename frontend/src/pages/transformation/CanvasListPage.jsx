import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Collapse,
    Divider,
    TextField,
    InputAdornment,
    Snackbar,
    Alert,
    Fade,
    TablePagination,
} from '@mui/material';
import {
    Description as CsvIcon,
    TableChart as XlsxIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    FolderOpen as EmptyIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

const FORMAT_COLORS = {
    xlsx: '#217346',
    xls: '#1D6F42',
    csv: '#F59E0B',
};

/* ─── File Row ──────────────────────────────────────────────────── */
function FileRow({ file, index, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const fmtColor = FORMAT_COLORS[file.file_format] || '#888';

    return (
        <Box>
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 80px 80px 160px 40px 30px',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0
                        ? 'transparent'
                        : alpha(palette.bgSecondary, 0.3),
                    transition: 'background-color 0.15s',
                    '&:hover': {
                        backgroundColor: alpha(palette.accentPrimary, 0.06),
                    },
                    borderLeft: expanded
                        ? `2px solid ${palette.accentPrimary}`
                        : '2px solid transparent',
                }}
            >
                {/* Index */}
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                    }}
                >
                    {String(index + 1).padStart(3, '0')}
                </Typography>

                {/* Filename */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {file.file_format === 'csv' ? (
                        <CsvIcon sx={{ fontSize: 16, color: fmtColor, flexShrink: 0 }} />
                    ) : (
                        <XlsxIcon sx={{ fontSize: 16, color: fmtColor, flexShrink: 0 }} />
                    )}
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: palette.textPrimary,
                        }}
                    >
                        {file.original_filename}
                    </Typography>
                </Box>

                {/* Format badge */}
                <Chip
                    label={file.file_format.toUpperCase()}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        backgroundColor: alpha(fmtColor, 0.15),
                        color: fmtColor,
                        '& .MuiChip-label': { px: 0.75 },
                    }}
                />

                {/* Field count */}
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: palette.accentPrimary,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                    }}
                >
                    {file.field_count} fields
                </Typography>

                {/* Date */}
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                    }}
                >
                    {new Date(file.created_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Typography>

                {/* Delete */}
                <Tooltip title="Delete">
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
                        <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>

                {/* Expand */}
                {expanded ? (
                    <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                ) : (
                    <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                )}
            </Box>

            {/* Expandable headers */}
            <Collapse in={expanded}>
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        pl: 7,
                        backgroundColor: alpha(palette.bgSecondary, 0.5),
                        borderLeft: `2px solid ${palette.accentPrimary}`,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            color: palette.accentPrimary,
                            fontSize: '0.65rem',
                            letterSpacing: '0.05em',
                            display: 'block',
                            mb: 0.75,
                        }}
                    >
                        ▸ CAPTURED FIELDS
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {file.headers_json.map((header, idx) => (
                            <Chip
                                key={idx}
                                label={header}
                                size="small"
                                variant="outlined"
                                sx={{
                                    height: 22,
                                    fontSize: '0.72rem',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    borderColor: alpha(palette.accentPrimary, 0.25),
                                    color: palette.textPrimary,
                                    '& .MuiChip-label': { px: 0.75 },
                                }}
                            />
                        ))}
                        {file.headers_json.length === 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No headers captured
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
const ROWS_PER_PAGE = 20;

export default function CanvasListPage() {
    const [files, setFiles] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const loadFiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/transformation/files/?type=canvas');
            setFiles(res.data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/transformation/files/${id}/`);
            setFiles((prev) => prev.filter((f) => f.id !== id));
            setSnackbar({ open: true, message: 'File deleted', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Delete failed', severity: 'error' });
        }
    };

    const filtered = files.filter((f) =>
        f.original_filename.toLowerCase().includes(search.toLowerCase())
    );

    const paginatedFiles = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        List of Canvas
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        All uploaded canvas files with extracted column headers
                    </Typography>
                </Box>
                <Chip
                    label={`${files.length} file${files.length !== 1 ? 's' : ''}`}
                    sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                        backgroundColor: alpha(palette.accentPrimary, 0.12),
                        color: palette.accentPrimary,
                    }}
                />
            </Box>

            {/* Search */}
            <TextField
                size="small"
                placeholder="Search canvas files..."
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
                    mb: 2,
                    width: 320,
                    '& .MuiOutlinedInput-root': {
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.8rem',
                        backgroundColor: alpha(palette.bgSecondary, 0.5),
                        '& fieldset': { borderColor: palette.border },
                        '&:hover fieldset': { borderColor: palette.accentPrimary },
                    },
                }}
            />

            {/* Table */}
            <Paper
                elevation={0}
                sx={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    backgroundColor: alpha(palette.bgPrimary, 0.5),
                }}
            >
                {/* Column headers */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 80px 80px 160px 40px 30px',
                        alignItems: 'center',
                        px: 2,
                        py: 1,
                        borderBottom: `1px solid ${palette.border}`,
                        backgroundColor: alpha(palette.bgSecondary, 0.6),
                    }}
                >
                    {['#', 'FILENAME', 'FORMAT', 'FIELDS', 'UPLOADED', '', ''].map((col, i) => (
                        <Typography
                            key={i}
                            variant="caption"
                            sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                color: palette.accentPrimary,
                                letterSpacing: '0.08em',
                            }}
                        >
                            {col}
                        </Typography>
                    ))}
                </Box>

                {/* Rows */}
                {filtered.length === 0 && !loading && (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <EmptyIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            {search ? 'No matching files found' : 'No canvas files uploaded yet'}
                        </Typography>
                    </Box>
                )}

                {paginatedFiles.map((file, idx) => (
                    <FileRow key={file.id} file={file} index={page * ROWS_PER_PAGE + idx} onDelete={handleDelete} />
                ))}

                {/* Footer */}
                {filtered.length > 0 && (
                    <Box
                        sx={{
                            px: 2,
                            py: 0.75,
                            borderTop: `1px solid ${palette.border}`,
                            backgroundColor: alpha(palette.bgSecondary, 0.4),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: '"JetBrains Mono", monospace',
                                color: 'text.secondary',
                                fontSize: '0.65rem',
                            }}
                        >
                            {filtered.length} of {files.length} records
                        </Typography>
                        <TablePagination
                            component="div"
                            count={filtered.length}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            rowsPerPage={ROWS_PER_PAGE}
                            rowsPerPageOptions={[ROWS_PER_PAGE]}
                            sx={{
                                '.MuiTablePagination-toolbar': {
                                    minHeight: 32,
                                    px: 0,
                                },
                                '.MuiTablePagination-displayedRows': {
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.65rem',
                                    color: 'text.secondary',
                                    m: 0,
                                },
                                '.MuiTablePagination-actions button': {
                                    color: palette.accentPrimary,
                                    p: 0.25,
                                },
                            }}
                        />
                    </Box>
                )}
            </Paper>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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
