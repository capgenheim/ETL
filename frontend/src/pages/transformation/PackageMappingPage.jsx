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
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputLabel,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowForward as ArrowIcon,
    CheckCircle as MappedIcon,
    Warning as UnmappedIcon,
    NavigateNext as NavIcon,
    Settings as ConditionIcon,
    Code as ConstantIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { palette } from '../../theme/bloombergTheme';
import api from '../../services/api';

/* ─── Operators for conditions ────────────────────────────────── */
const OPERATORS = [
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
    { value: 'contains', label: 'contains' },
    { value: 'not_empty', label: 'not empty' },
    { value: 'is_empty', label: 'is empty' },
];

/* ─── Condition Builder Dialog ───────────────────────────────── */
function ConditionDialog({ open, onClose, onSave, sourceHeaders, initial }) {
    const [conditionType, setConditionType] = useState(initial?.condition_type || 'if_else');
    const [sourceField, setSourceField] = useState(initial?.source_field || '');
    const [operator, setOperator] = useState(initial?.operator || '>');
    const [compareValue, setCompareValue] = useState(initial?.compare_value || '');
    const [thenMode, setThenMode] = useState(initial?.then_source ? 'field' : 'value');
    const [thenSource, setThenSource] = useState(initial?.then_source || '');
    const [thenValue, setThenValue] = useState(initial?.then_value || '');
    const [elseMode, setElseMode] = useState(initial?.else_source ? 'field' : 'value');
    const [elseSource, setElseSource] = useState(initial?.else_source || '');
    const [elseValue, setElseValue] = useState(initial?.else_value || '');

    useEffect(() => {
        if (open && initial) {
            setConditionType(initial.condition_type || 'if_else');
            setSourceField(initial.source_field || '');
            setOperator(initial.operator || '>');
            setCompareValue(initial.compare_value || '');
            setThenMode(initial.then_source ? 'field' : 'value');
            setThenSource(initial.then_source || '');
            setThenValue(initial.then_value || '');
            setElseMode(initial.else_source ? 'field' : 'value');
            setElseSource(initial.else_source || '');
            setElseValue(initial.else_value || '');
        }
    }, [open, initial]);

    const noCompareNeeded = operator === 'not_empty' || operator === 'is_empty';

    const handleSave = () => {
        const cond = {
            condition_type: conditionType,
            source_field: sourceField,
            operator,
            compare_value: noCompareNeeded ? '' : compareValue,
            then_source: thenMode === 'field' ? thenSource : '',
            then_value: thenMode === 'value' ? thenValue : '',
            else_source: conditionType === 'if_else' && elseMode === 'field' ? elseSource : '',
            else_value: conditionType === 'if_else' && elseMode === 'value' ? elseValue : '',
        };
        onSave(cond);
        onClose();
    };

    const sectionSx = {
        p: 2,
        mb: 2,
        borderRadius: 1.5,
        border: `1px solid ${palette.border}`,
        backgroundColor: alpha(palette.bgPrimary, 0.4),
    };

    const labelSx = {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: palette.accentPrimary,
        textTransform: 'uppercase',
        mb: 1.5,
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: palette.bgPrimary,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                    backgroundImage: 'none',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${palette.border}`,
                    py: 1.5,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ConditionIcon sx={{ color: palette.accentPrimary, fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, color: palette.textPrimary, fontSize: '0.95rem' }}>
                        Condition Builder
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                {/* Condition Type Toggle */}
                <Box sx={{ mb: 2.5, textAlign: 'center' }}>
                    <ToggleButtonGroup
                        value={conditionType}
                        exclusive
                        onChange={(_, v) => v && setConditionType(v)}
                        size="small"
                        sx={{
                            '& .MuiToggleButton-root': {
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: 'text.secondary',
                                borderColor: palette.border,
                                px: 2.5,
                                '&.Mui-selected': {
                                    backgroundColor: alpha(palette.accentPrimary, 0.12),
                                    color: palette.accentPrimary,
                                    borderColor: palette.accentPrimary,
                                },
                            },
                        }}
                    >
                        <ToggleButton value="if_else">IF / ELSE</ToggleButton>
                        <ToggleButton value="if_only">IF Only</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* IF Condition */}
                <Box sx={sectionSx}>
                    <Typography sx={labelSx}>⚡ IF Condition</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
                            <InputLabel sx={{ fontSize: '0.75rem' }}>Source Field</InputLabel>
                            <Select
                                value={sourceField}
                                onChange={(e) => setSourceField(e.target.value)}
                                label="Source Field"
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                }}
                            >
                                {sourceHeaders.map((h) => (
                                    <MenuItem key={h} value={h} sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                                        {h}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel sx={{ fontSize: '0.75rem' }}>Operator</InputLabel>
                            <Select
                                value={operator}
                                onChange={(e) => setOperator(e.target.value)}
                                label="Operator"
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                }}
                            >
                                {OPERATORS.map((op) => (
                                    <MenuItem key={op.value} value={op.value} sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                                        {op.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {!noCompareNeeded && (
                            <TextField
                                size="small"
                                label="Compare Value"
                                value={compareValue}
                                onChange={(e) => setCompareValue(e.target.value)}
                                sx={{
                                    minWidth: 120,
                                    flex: 1,
                                    '& input': { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' },
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* THEN Branch */}
                <Box sx={sectionSx}>
                    <Typography sx={labelSx}>✅ THEN (condition met)</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <ToggleButtonGroup
                            value={thenMode}
                            exclusive
                            onChange={(_, v) => v && setThenMode(v)}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    px: 1.5,
                                    py: 0.3,
                                    color: 'text.secondary',
                                    borderColor: palette.border,
                                    '&.Mui-selected': {
                                        backgroundColor: alpha(palette.success, 0.12),
                                        color: palette.success,
                                        borderColor: alpha(palette.success, 0.4),
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="field">Source Field</ToggleButton>
                            <ToggleButton value="value">Literal Value</ToggleButton>
                        </ToggleButtonGroup>

                        {thenMode === 'field' ? (
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <Select
                                    value={thenSource}
                                    onChange={(e) => setThenSource(e.target.value)}
                                    displayEmpty
                                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}
                                >
                                    <MenuItem value="" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>
                                        — Select field —
                                    </MenuItem>
                                    {sourceHeaders.map((h) => (
                                        <MenuItem key={h} value={h} sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                                            {h}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : (
                            <TextField
                                size="small"
                                placeholder="Enter value..."
                                value={thenValue}
                                onChange={(e) => setThenValue(e.target.value)}
                                sx={{
                                    flex: 1,
                                    '& input': { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' },
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* ELSE Branch */}
                {conditionType === 'if_else' && (
                    <Box sx={sectionSx}>
                        <Typography sx={labelSx}>❌ ELSE (condition not met)</Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <ToggleButtonGroup
                                value={elseMode}
                                exclusive
                                onChange={(_, v) => v && setElseMode(v)}
                                size="small"
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        px: 1.5,
                                        py: 0.3,
                                        color: 'text.secondary',
                                        borderColor: palette.border,
                                        '&.Mui-selected': {
                                            backgroundColor: alpha(palette.warning, 0.12),
                                            color: palette.warning,
                                            borderColor: alpha(palette.warning, 0.4),
                                        },
                                    },
                                }}
                            >
                                <ToggleButton value="field">Source Field</ToggleButton>
                                <ToggleButton value="value">Literal Value</ToggleButton>
                            </ToggleButtonGroup>

                            {elseMode === 'field' ? (
                                <FormControl size="small" sx={{ flex: 1 }}>
                                    <Select
                                        value={elseSource}
                                        onChange={(e) => setElseSource(e.target.value)}
                                        displayEmpty
                                        sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}
                                    >
                                        <MenuItem value="" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>
                                            — Select field —
                                        </MenuItem>
                                        {sourceHeaders.map((h) => (
                                            <MenuItem key={h} value={h} sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                                                {h}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <TextField
                                    size="small"
                                    placeholder="Enter value..."
                                    value={elseValue}
                                    onChange={(e) => setElseValue(e.target.value)}
                                    sx={{
                                        flex: 1,
                                        '& input': { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' },
                                    }}
                                />
                            )}
                        </Box>
                    </Box>
                )}

                {/* Preview */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(palette.accentPrimary, 0.2)}`,
                        backgroundColor: alpha(palette.bgElevated, 0.4),
                    }}
                >
                    <Typography sx={{ ...labelSx, mb: 1 }}>📋 Rule Preview</Typography>
                    <Typography
                        sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.75rem',
                            color: palette.textPrimary,
                            lineHeight: 1.8,
                        }}
                    >
                        <Box component="span" sx={{ color: '#c586c0' }}>IF </Box>
                        <Box component="span" sx={{ color: '#9cdcfe' }}>{sourceField || '<?>'}</Box>
                        {' '}
                        <Box component="span" sx={{ color: palette.accentPrimary }}>{operator}</Box>
                        {!noCompareNeeded && (
                            <>
                                {' '}
                                <Box component="span" sx={{ color: '#ce9178' }}>
                                    {compareValue ? `"${compareValue}"` : '"<?>"'}
                                </Box>
                            </>
                        )}
                        <br />
                        <Box component="span" sx={{ color: '#c586c0' }}>  THEN → </Box>
                        <Box component="span" sx={{ color: '#4ec9b0' }}>
                            {thenMode === 'field' ? (thenSource || '<?>') : `"${thenValue}"`}
                        </Box>
                        {conditionType === 'if_else' && (
                            <>
                                <br />
                                <Box component="span" sx={{ color: '#c586c0' }}>  ELSE → </Box>
                                <Box component="span" sx={{ color: '#dcdcaa' }}>
                                    {elseMode === 'field' ? (elseSource || '<?>') : `"${elseValue}"`}
                                </Box>
                            </>
                        )}
                    </Typography>
                </Paper>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${palette.border}` }}>
                <Button
                    onClick={onClose}
                    sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!sourceField}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        backgroundColor: palette.accentPrimary,
                        '&:hover': { backgroundColor: alpha(palette.accentPrimary, 0.85) },
                    }}
                >
                    Apply Condition
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/* ─── Mapping Row ────────────────────────────────────────────── */
function MappingRow({ canvasHeader, sourceHeaders, mapping, onChange, index }) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const mappingType = mapping.mapping_type || 'direct';
    const hasCondition = mapping.has_condition || false;
    const isMapped = mappingType === 'constant'
        ? !!mapping.constant_value
        : hasCondition
            ? !!mapping.condition_json?.source_field
            : !!mapping.source_header;

    const handleToggleCondition = () => {
        if (!hasCondition) {
            // Turning ON: switch to condition mode
            onChange(canvasHeader, {
                ...mapping,
                has_condition: true,
                mapping_type: 'condition',
            });
        } else {
            // Turning OFF: revert to direct
            onChange(canvasHeader, {
                ...mapping,
                has_condition: false,
                mapping_type: 'direct',
                condition_json: null,
            });
        }
    };

    const handleConditionSave = (cond) => {
        onChange(canvasHeader, {
            ...mapping,
            mapping_type: 'condition',
            has_condition: true,
            condition_json: cond,
        });
    };

    const handleConstantToggle = () => {
        if (mappingType === 'constant') {
            onChange(canvasHeader, {
                ...mapping,
                mapping_type: 'direct',
                constant_value: '',
            });
        } else {
            onChange(canvasHeader, {
                ...mapping,
                mapping_type: 'constant',
                has_condition: false,
                condition_json: null,
                source_header: '',
            });
        }
    };

    // Build a summary chip for condition
    const conditionSummary = () => {
        if (!mapping.condition_json) return null;
        const c = mapping.condition_json;
        const op = c.operator || '==';
        const noComp = op === 'not_empty' || op === 'is_empty';
        return (
            <Tooltip
                title={
                    `IF ${c.source_field} ${op}${noComp ? '' : ` "${c.compare_value}"`} THEN → ${c.then_source || `"${c.then_value}"`}` +
                    (c.condition_type === 'if_else' ? ` ELSE → ${c.else_source || `"${c.else_value}"`}` : '')
                }
            >
                <Chip
                    label={`IF ${c.source_field || '?'} ${op}${noComp ? '' : ` ${c.compare_value}`}`}
                    size="small"
                    onClick={() => setDialogOpen(true)}
                    sx={{
                        height: 22,
                        fontSize: '0.6rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: alpha('#c586c0', 0.15),
                        color: '#c586c0',
                        border: `1px solid ${alpha('#c586c0', 0.3)}`,
                        '& .MuiChip-label': { px: 1 },
                        '&:hover': { backgroundColor: alpha('#c586c0', 0.25) },
                    }}
                />
            </Tooltip>
        );
    };

    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 60px 1fr 90px 40px',
                    alignItems: 'center',
                    gap: 1.5,
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

                {/* Source / Condition / Constant input */}
                <Box>
                    {mappingType === 'constant' ? (
                        <TextField
                            size="small"
                            placeholder="Enter constant value..."
                            value={mapping.constant_value || ''}
                            onChange={(e) =>
                                onChange(canvasHeader, { ...mapping, constant_value: e.target.value })
                            }
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <ConstantIcon sx={{ fontSize: 16, color: '#dcdcaa', mr: 0.5 }} />
                                ),
                            }}
                            sx={{
                                '& input': {
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                },
                                '& fieldset': {
                                    borderColor: isMapped ? alpha('#dcdcaa', 0.3) : palette.border,
                                },
                                '&:hover fieldset': { borderColor: palette.accentPrimary },
                            }}
                        />
                    ) : hasCondition ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {conditionSummary() || (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ConditionIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => setDialogOpen(true)}
                                    sx={{
                                        textTransform: 'none',
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: '0.7rem',
                                        borderColor: alpha('#c586c0', 0.4),
                                        color: '#c586c0',
                                        '&:hover': {
                                            borderColor: '#c586c0',
                                            backgroundColor: alpha('#c586c0', 0.08),
                                        },
                                    }}
                                >
                                    Configure Condition
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <FormControl fullWidth size="small">
                            <Select
                                value={mapping.source_header || ''}
                                onChange={(e) =>
                                    onChange(canvasHeader, { ...mapping, source_header: e.target.value })
                                }
                                displayEmpty
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                    height: 36,
                                    backgroundColor: alpha(palette.bgSurface, 0.6),
                                    '& fieldset': {
                                        borderColor: isMapped ? alpha(palette.success, 0.3) : palette.border,
                                    },
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
                    )}
                </Box>

                {/* Condition / Constant toggles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, justifyContent: 'center' }}>
                    <Tooltip title={hasCondition ? 'Disable condition' : 'Add IF/ELSE condition'}>
                        <IconButton
                            size="small"
                            onClick={handleToggleCondition}
                            disabled={mappingType === 'constant'}
                            sx={{
                                color: hasCondition ? '#c586c0' : 'text.secondary',
                                backgroundColor: hasCondition ? alpha('#c586c0', 0.1) : 'transparent',
                                '&:hover': { backgroundColor: alpha('#c586c0', 0.15) },
                                fontSize: 16,
                                width: 28,
                                height: 28,
                            }}
                        >
                            <ConditionIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={mappingType === 'constant' ? 'Switch to direct' : 'Use constant value'}>
                        <IconButton
                            size="small"
                            onClick={handleConstantToggle}
                            disabled={hasCondition}
                            sx={{
                                color: mappingType === 'constant' ? '#dcdcaa' : 'text.secondary',
                                backgroundColor: mappingType === 'constant' ? alpha('#dcdcaa', 0.1) : 'transparent',
                                '&:hover': { backgroundColor: alpha('#dcdcaa', 0.15) },
                                fontSize: 16,
                                width: 28,
                                height: 28,
                            }}
                        >
                            <ConstantIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>

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

            {/* Condition Builder Dialog */}
            <ConditionDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleConditionSave}
                sourceHeaders={sourceHeaders}
                initial={mapping.condition_json}
            />
        </>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function PackageMappingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pkg, setPkg] = useState(null);
    const [mappings, setMappings] = useState({});  // { canvasHeader: { source_header, mapping_type, ... } }
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
                existing[m.canvas_header] = {
                    source_header: m.source_header || '',
                    mapping_type: m.mapping_type || 'direct',
                    has_condition: m.has_condition || false,
                    condition_json: m.condition_json || null,
                    constant_value: m.constant_value || '',
                };
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

    const handleMappingChange = (canvasHeader, mappingData) => {
        setMappings((prev) => ({
            ...prev,
            [canvasHeader]: mappingData,
        }));
    };

    const handleSave = async () => {
        const mapped = Object.entries(mappings)
            .filter(([, m]) => {
                if (m.mapping_type === 'constant') return !!m.constant_value;
                if (m.has_condition) return !!m.condition_json?.source_field;
                return !!m.source_header;
            })
            .map(([canvas_header, m], idx) => ({
                canvas_header,
                source_header: m.source_header || '',
                order: idx,
                mapping_type: m.mapping_type || 'direct',
                has_condition: m.has_condition || false,
                condition_json: m.condition_json || null,
                constant_value: m.constant_value || '',
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
    const mappedCount = Object.values(mappings).filter((m) => {
        if (m.mapping_type === 'constant') return !!m.constant_value;
        if (m.has_condition) return !!m.condition_json?.source_field;
        return !!m.source_header;
    }).length;

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
                        gridTemplateColumns: '40px 1fr 60px 1fr 90px 40px',
                        gap: 1.5,
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
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>Logic</Typography>
                    <Typography sx={{ ...headerCellSx, textAlign: 'center' }}>✓</Typography>
                </Box>

                {/* Mapping Rows */}
                {canvasHeaders.length > 0 ? (
                    canvasHeaders.map((header, idx) => (
                        <MappingRow
                            key={header}
                            canvasHeader={header}
                            sourceHeaders={sourceHeaders}
                            mapping={mappings[header] || { source_header: '', mapping_type: 'direct', has_condition: false }}
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
