import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect } from 'vitest';
import bloombergTheme from '../theme/bloombergTheme';
import Sidebar from '../components/Sidebar';
import { AuthProvider } from '../contexts/AuthContext';

// Mock API
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

function renderSidebar(open = false) {
    return render(
        <ThemeProvider theme={bloombergTheme}>
            <MemoryRouter>
                <AuthProvider>
                    <Sidebar open={open} />
                </AuthProvider>
            </MemoryRouter>
        </ThemeProvider>
    );
}

describe('Sidebar', () => {
    it('renders navigation items', () => {
        renderSidebar(true);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('hides text labels when collapsed', () => {
        renderSidebar(false);
        // When collapsed, text items should not be rendered
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });

    it('shows text labels when expanded', () => {
        renderSidebar(true);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('shows sign out button', () => {
        renderSidebar(true);
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('shows brand name when expanded', () => {
        renderSidebar(true);
        expect(screen.getByText('ETL Platform')).toBeInTheDocument();
    });

    it('hides brand name when collapsed', () => {
        renderSidebar(false);
        expect(screen.queryByText('ETL Platform')).not.toBeInTheDocument();
    });
});
