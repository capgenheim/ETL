import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import bloombergTheme from '../theme/bloombergTheme';
import LoginPage from '../pages/LoginPage';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the API module
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

function renderWithProviders(ui, { route = '/login' } = {}) {
    return render(
        <ThemeProvider theme={bloombergTheme}>
            <MemoryRouter initialEntries={[route]}>
                <AuthProvider>{ui}</AuthProvider>
            </MemoryRouter>
        </ThemeProvider>
    );
}

describe('LoginPage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders the login form', () => {
        renderWithProviders(<LoginPage />);
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders the ETL Platform branding', () => {
        renderWithProviders(<LoginPage />);
        expect(screen.getByText('ETL Platform')).toBeInTheDocument();
        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });

    it('disables submit button when fields are empty', () => {
        renderWithProviders(<LoginPage />);
        const button = screen.getByRole('button', { name: /sign in/i });
        expect(button).toBeDisabled();
    });

    it('enables submit button when fields are filled', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');

        const button = screen.getByRole('button', { name: /sign in/i });
        expect(button).not.toBeDisabled();
    });

    it('toggles password visibility', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const passwordInput = screen.getByLabelText(/password/i);
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Find and click the visibility toggle button
        const toggleButtons = screen.getAllByRole('button');
        const visibilityToggle = toggleButtons.find(
            btn => btn !== screen.getByRole('button', { name: /sign in/i })
        );

        if (visibilityToggle) {
            await user.click(visibilityToggle);
            expect(passwordInput).toHaveAttribute('type', 'text');
        }
    });
});
