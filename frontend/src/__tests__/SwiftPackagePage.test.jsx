import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import bloombergTheme from '../theme/bloombergTheme';
import SwiftPackagePage from '../pages/SwiftPackagePage';

// Mock the API module
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

import api from '../services/api';

function renderWithProviders(ui) {
    return render(
        <ThemeProvider theme={bloombergTheme}>
            <MemoryRouter initialEntries={['/swift/packages']}>
                {ui}
            </MemoryRouter>
        </ThemeProvider>
    );
}

describe('SwiftPackagePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the page header and create button', async () => {
        api.get.mockResolvedValueOnce({ data: [] });          // packages list
        api.get.mockResolvedValueOnce({ data: { MT: [], MX: [] } }); // types

        renderWithProviders(<SwiftPackagePage />);

        expect(screen.getByText('SWIFT Packages')).toBeInTheDocument();
        expect(screen.getByText('Create Package')).toBeInTheDocument();
    });

    it('renders empty state when no packages returned', async () => {
        api.get.mockResolvedValueOnce({ data: [] });
        api.get.mockResolvedValueOnce({ data: { MT: [], MX: [] } });

        renderWithProviders(<SwiftPackagePage />);

        // Wait for loading to finish
        expect(await screen.findByText('No SWIFT Packages')).toBeInTheDocument();
    });

    it('renders package rows with all columns', async () => {
        const mockPackages = [
            {
                id: 1,
                name: 'Test Package',
                description: 'Test desc',
                message_types: ['MT103', 'MT540'],
                output_format: 'xlsx',
                processing_mode: 'instant',
                batch_interval_minutes: 30,
                file_pattern: '*.fin',
                status: 'active',
                run_log_summary: { total: 5, success: 3, failed: 2, last_run: '2026-03-16T08:00:00Z', last_status: 'success', last_run_type: 'instant' },
                created_at: '2026-03-16T08:00:00Z',
                updated_at: '2026-03-16T08:00:00Z',
            },
        ];

        api.get.mockResolvedValueOnce({ data: mockPackages });
        api.get.mockResolvedValueOnce({ data: { MT: [], MX: [] } });

        renderWithProviders(<SwiftPackagePage />);

        expect(await screen.findByText('Test Package')).toBeInTheDocument();
        expect(screen.getByText('MT103')).toBeInTheDocument();
        expect(screen.getByText('MT540')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('opens create dialog when Create Package button is clicked', async () => {
        const user = userEvent.setup();
        api.get.mockResolvedValueOnce({ data: [] });
        api.get.mockResolvedValueOnce({ data: { MT: [], MX: [] } });

        renderWithProviders(<SwiftPackagePage />);

        await user.click(screen.getByText('Create Package'));

        expect(await screen.findByText('Create SWIFT Package')).toBeInTheDocument();
    });

    it('renders status control buttons (play, pause, stop)', async () => {
        const mockPackages = [
            {
                id: 1,
                name: 'Active Package',
                description: '',
                message_types: ['ALL'],
                output_format: 'csv',
                processing_mode: 'instant',
                batch_interval_minutes: 30,
                file_pattern: '*.*',
                status: 'active',
                run_log_summary: { total: 0, success: 0, failed: 0, last_run: null, last_status: null, last_run_type: null },
                created_at: '2026-03-16T08:00:00Z',
                updated_at: '2026-03-16T08:00:00Z',
            },
        ];

        api.get.mockResolvedValueOnce({ data: mockPackages });
        api.get.mockResolvedValueOnce({ data: { MT: [], MX: [] } });

        renderWithProviders(<SwiftPackagePage />);

        // Wait for package to render
        await screen.findByText('Active Package');

        // Check action buttons exist — MUI renders multiple IconButtons in each row
        const buttons = screen.getAllByRole('button');
        // Should have at minimum: Refresh + Create + (Start + Pause + Stop + Edit + Delete) = 7
        expect(buttons.length).toBeGreaterThanOrEqual(7);
    });
});
