import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import bloombergTheme from '../theme/bloombergTheme';
import SwiftPage from '../pages/SwiftPage';

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
            <MemoryRouter initialEntries={['/swift']}>
                {ui}
            </MemoryRouter>
        </ThemeProvider>
    );
}

describe('SwiftPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the page header and upload button', async () => {
        api.get.mockResolvedValueOnce({ data: [] });

        renderWithProviders(<SwiftPage />);

        expect(screen.getByText('SWIFT Messages')).toBeInTheDocument();
        expect(screen.getByText(/Upload SWIFT File/i)).toBeInTheDocument();
    });

    it('renders grid column headers', async () => {
        api.get.mockResolvedValueOnce({ data: [] });

        renderWithProviders(<SwiftPage />);

        expect(screen.getByText('#')).toBeInTheDocument();
        expect(screen.getByText(/Reference/i)).toBeInTheDocument();
        expect(screen.getByText(/Sender/i)).toBeInTheDocument();
        expect(screen.getByText(/Status/i)).toBeInTheDocument();
    });

    it('renders stats summary with zero counts', async () => {
        api.get.mockResolvedValueOnce({ data: [] });

        renderWithProviders(<SwiftPage />);

        // Should show zero messages in the stats line
        expect(await screen.findByText(/0 messages/)).toBeInTheDocument();
    });
});
