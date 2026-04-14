import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, MenuItem,
    InputAdornment, IconButton, Tooltip, CircularProgress,
    TablePagination, alpha, Stack, Skeleton,
} from '@mui/material';
import {
    Search as SearchIcon,
    CheckCircle as SuccessIcon,
    Cancel as FailedIcon,
    Assessment as TotalIcon,
    TrendingUp as RateIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    SwapVert as SortIcon,
} from '@mui/icons-material';
import { palette } from '../theme/bloombergTheme';
import api from '../services/api';

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ title, value, icon: Icon, color, subtitle }) {
    return (
        <Paper
            sx={{
                p: 2.5,
                flex: 1,
                minWidth: 180,
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
                    <Typography variant="overline" sx={{ color: palette.textSecondary, fontSize: '0.65rem' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color, mt: 0.5 }}>
                        {value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" sx={{ color: palette.textSecondary, mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Icon sx={{ fontSize: 36, color: alpha(color, 0.4) }} />
            </Box>
        </Paper>
    );
}

/* ─── Status Chip ───────────────────────────────────────────────── */
function StatusChip({ status }) {
    const isSuccess = status === 'success';
    return (
        <Chip
            icon={isSuccess ? <SuccessIcon sx={{ fontSize: 16 }} /> : <FailedIcon sx={{ fontSize: 16 }} />}
            label={isSuccess ? 'Success' : 'Failed'}
            size="small"
            sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                backgroundColor: alpha(isSuccess ? palette.success : palette.error, 0.12),
                color: isSuccess ? palette.success : palette.error,
                border: `1px solid ${alpha(isSuccess ? palette.success : palette.error, 0.25)}`,
                '& .MuiChip-icon': {
                    color: isSuccess ? palette.success : palette.error,
                },
            }}
        />
    );
}

/* ─── Package Type Chip ─────────────────────────────────────────── */
function PackageTypeChip({ type }) {
    const isSwift = type === 'SWIFT';
    const color = isSwift ? palette.info : palette.accentPrimary;
    return (
        <Chip
            label={type}
            size="small"
            sx={{
                fontWeight: 600,
                fontSize: '0.7rem',
                backgroundColor: alpha(color, 0.12),
                color,
                border: `1px solid ${alpha(color, 0.25)}`,
            }}
        />
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function AuditPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (typeFilter) params.append('package_type', typeFilter);
            if (search) params.append('search', search);
            params.append('page', page + 1);
            params.append('page_size', rowsPerPage);

            const resp = await api.get(`/dashboard/audit-trail/?${params}`);
            setData(resp.data);
        } catch (err) {
            console.error('Failed to fetch audit trail:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter, search, page, rowsPerPage]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(0);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleStatusChange = (e) => { setStatusFilter(e.target.value); setPage(0); };
    const handleTypeChange = (e) => { setTypeFilter(e.target.value); setPage(0); };
    const handlePageChange = (_, newPage) => setPage(newPage);
    const handleRowsPerPageChange = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

    const summary = data?.summary || { total: 0, success: 0, failed: 0, success_rate: 0 };
    const results = data?.results || [];
    const pagination = data?.pagination || { total_items: 0 };

    const formatTimestamp = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                        Audit Trail
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Package processing events — success and failure logs
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton
                        onClick={fetchData}
                        sx={{
                            color: palette.accentPrimary,
                            border: `1px solid ${palette.border}`,
                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.08) },
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Summary Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <StatCard
                    title="Total Runs"
                    value={loading ? '—' : summary.total.toLocaleString()}
                    icon={TotalIcon}
                    color={palette.info}
                />
                <StatCard
                    title="Successful"
                    value={loading ? '—' : summary.success.toLocaleString()}
                    icon={SuccessIcon}
                    color={palette.success}
                />
                <StatCard
                    title="Failed"
                    value={loading ? '—' : summary.failed.toLocaleString()}
                    icon={FailedIcon}
                    color={palette.error}
                />
                <StatCard
                    title="Success Rate"
                    value={loading ? '—' : `${summary.success_rate}%`}
                    icon={RateIcon}
                    color={palette.accentPrimary}
                />
            </Stack>

            {/* Filters */}
            <Paper
                sx={{
                    p: 2, mb: 2,
                    backgroundColor: palette.bgSecondary,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <FilterIcon sx={{ color: palette.textSecondary, fontSize: 20 }} />
                    <TextField
                        placeholder="Search files, packages..."
                        size="small"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: palette.textSecondary }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: 260 }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Status"
                        value={statusFilter}
                        onChange={handleStatusChange}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="success">Success</MenuItem>
                        <MenuItem value="failed">Failed</MenuItem>
                    </TextField>
                    <TextField
                        select
                        size="small"
                        label="Package Type"
                        value={typeFilter}
                        onChange={handleTypeChange}
                        sx={{ minWidth: 170 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="transformation">Transformation</MenuItem>
                        <MenuItem value="swift">SWIFT</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* Data Table */}
            <Paper
                sx={{
                    backgroundColor: palette.bgSecondary,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {['Timestamp', 'Package', 'Type', 'File', 'Status', 'Details', 'Run Mode'].map((h) => (
                                    <TableCell
                                        key={h}
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            color: palette.textSecondary,
                                            backgroundColor: palette.bgElevated,
                                            borderBottom: `1px solid ${palette.border}`,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            whiteSpace: 'nowrap',
                                            py: 1.5,
                                        }}
                                    >
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(7)].map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton variant="text" sx={{ bgcolor: palette.bgElevated }} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                        <SortIcon sx={{ fontSize: 48, color: palette.textDisabled, mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            No audit records found
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            Run a package to see processing logs here
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((entry) => (
                                    <TableRow
                                        key={entry.id}
                                        sx={{
                                            transition: 'background-color 0.15s',
                                            '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.04) },
                                            '& td': {
                                                borderBottom: `1px solid ${palette.divider}`,
                                                py: 1.2,
                                                fontSize: '0.85rem',
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontFamily: '"Roboto Mono", monospace',
                                                    color: palette.textSecondary,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {formatTimestamp(entry.timestamp)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500, color: palette.textPrimary }}>
                                                {entry.package_name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <PackageTypeChip type={entry.package_type} />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={entry.original_filename} arrow>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        maxWidth: 220,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        color: palette.textPrimary,
                                                    }}
                                                >
                                                    {entry.original_filename}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <StatusChip status={entry.status} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: palette.textSecondary, fontSize: '0.8rem' }}>
                                                {entry.detail}
                                            </Typography>
                                            {entry.error_message && (
                                                <Tooltip title={entry.error_message} arrow>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: palette.error,
                                                            display: 'block',
                                                            maxWidth: 200,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            mt: 0.3,
                                                        }}
                                                    >
                                                        {entry.error_message}
                                                    </Typography>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={entry.run_type}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    fontSize: '0.7rem',
                                                    borderColor: palette.border,
                                                    color: palette.textSecondary,
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                    component="div"
                    count={pagination.total_items}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    sx={{
                        borderTop: `1px solid ${palette.border}`,
                        '.MuiTablePagination-toolbar': { minHeight: 48 },
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                            fontSize: '0.8rem',
                            color: palette.textSecondary,
                        },
                    }}
                />
            </Paper>
        </Box>
    );
}
