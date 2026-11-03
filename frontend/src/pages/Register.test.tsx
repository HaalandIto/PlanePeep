/**
 * Unit tests for Register page (src/pages/Register.tsx).
 *
 * Covers: render, success flow (postAuthRegister then postAuthLogin, onAuthSuccess, navigate),
 * error flow, submitting state. Mocks ../api postAuthRegister and postAuthLogin.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('../api', () => ({
    postAuthRegister: jest.fn(),
    postAuthLogin: jest.fn(),
}));

const { postAuthRegister, postAuthLogin } = require('../api') as {
    postAuthRegister: jest.Mock;
    postAuthLogin: jest.Mock;
};

const mockOnAuthSuccess = jest.fn();

function renderRegister(
    initialEntries = ['/register'],
    registerProps: Record<string, unknown> = {},
) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Register {...registerProps} />
        </MemoryRouter>,
    );
}

describe('Register', () => {
    beforeEach(() => {
        postAuthRegister.mockReset();
        postAuthLogin.mockReset();
        mockNavigate.mockClear();
        mockOnAuthSuccess.mockClear();
    });

    it('renders page title, Back link, form fields, and submit button', () => {
        renderRegister();
        expect(
            screen.getByRole('heading', { level: 1, name: 'Create an account' }),
        ).toBeInTheDocument();
        const backLink = screen.getByRole('link', { name: /← Back/i });
        expect(backLink).toHaveAttribute('href', '/');
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });

    it('calls postAuthRegister then postAuthLogin and navigates to / on success', async () => {
        const registerPayload = { userId: 1, username: 'u' };
        const loginPayload = {
            userId: 1,
            username: 'u',
            token: 'jwt-from-login',
        };
        postAuthRegister.mockResolvedValueOnce(registerPayload);
        postAuthLogin.mockResolvedValueOnce(loginPayload);
        renderRegister(['/register'], { onAuthSuccess: mockOnAuthSuccess });
        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        await waitFor(() => {
            expect(postAuthRegister).toHaveBeenCalledTimes(1);
        });
        expect(postAuthRegister).toHaveBeenCalledWith({
            username: 'u',
            password: 'p',
        });
        await waitFor(() => {
            expect(postAuthLogin).toHaveBeenCalledTimes(1);
        });
        expect(postAuthLogin).toHaveBeenCalledWith({ username: 'u', password: 'p' });
        expect(mockOnAuthSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(loginPayload);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('calls postAuthLogin only after postAuthRegister resolves', async () => {
        let resolveRegister: (value: unknown) => void;
        postAuthRegister.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveRegister = resolve;
                }),
        );
        postAuthLogin.mockResolvedValueOnce({ userId: 1, username: 'u', token: 'jwt-from-login' });

        renderRegister(['/register'], { onAuthSuccess: mockOnAuthSuccess });
        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

        expect(postAuthRegister).toHaveBeenCalledTimes(1);
        expect(postAuthLogin).not.toHaveBeenCalled();

        resolveRegister!({ userId: 1, username: 'u' });

        await waitFor(() => {
            expect(postAuthLogin).toHaveBeenCalledTimes(1);
        });
        expect(postAuthLogin).toHaveBeenCalledWith({ username: 'u', password: 'p' });
    });

    it('shows error alert when postAuthRegister rejects', async () => {
        postAuthRegister.mockRejectedValueOnce(new Error('username already exists'));
        renderRegister();
        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('username already exists');
        });
        expect(postAuthRegister).toHaveBeenCalledTimes(1);
    });

    it('disables submit button and shows Creating… while submitting', async () => {
        let resolveRegister: (value: unknown) => void;
        postAuthRegister.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveRegister = resolve;
                }),
        );
        postAuthLogin.mockResolvedValueOnce({ userId: 1, username: 'u', token: 't' });
        renderRegister();
        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Creating…' })).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
        resolveRegister!({ userId: 1, username: 'u' });
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: 'Creating…' })).not.toBeInTheDocument();
        });
    });
});
