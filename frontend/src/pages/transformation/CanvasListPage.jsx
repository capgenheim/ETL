import { Box, Typography, Paper, Chip } from '@mui/material';
import { GridView as CanvasIcon } from '@mui/icons-material';
import { palette } from '../../theme/bloombergTheme';

export default function CanvasListPage() {
    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: palette.textPrimary }}>
                    List of Canvas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    View and manage transformation canvases
                </Typography>
            </Box>
            <Paper
                sx={{
                    p: 4,
                    textAlign: 'center',
                    backgroundColor: palette.bgSecondary,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 2,
                }}
            >
                <CanvasIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    Canvas List Module
                </Typography>
                <Chip label="Coming Soon" size="small" sx={{ mt: 1 }} />
            </Paper>
        </Box>
    );
}
