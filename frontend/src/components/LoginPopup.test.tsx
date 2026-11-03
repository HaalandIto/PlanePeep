/**
 * Unit tests for LoginPopup (src/components/LoginPopup.tsx).
 *
 * Covers: render when open/closed, error display, onClose (overlay/close/Cancel/Register link),
 * onSubmit with credentials and input clearing. No API mock; component is presentational.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPopup from './LoginPopup';

interface RenderProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSubmit?: (c: { username: string; password: string }) => void;
    error?: string;
}

/**
 * Pre-test setup: render helper for LoginPopup.
 * - Wraps the component in MemoryRouter so the Register link (to /register) works without a full app router.
 * - Supplies default props (isOpen: false, onClose and onSubmit as jest.fn()) so tests can override only what they need via the props argument.
 */
function renderLoginPopup(props: RenderProps = {}) {
    return render(
        <MemoryRouter>
            <LoginPopup isOpen={false} onClose={jest.fn()} onSubmit={jest.fn()} {...props} />
        </MemoryRouter>,
    );
}

describe('LoginPopup', () => {
    // When the popup is closed, the component returns null so no dialog is in the DOM.
    it('renders nothing when isOpen is false', () => {
        renderLoginPopup({ isOpen: false });
        expect(screen.queryByRole('dialog', { name: 'Login' })).not.toBeInTheDocument();
    });

    // When open, the dialog shows title "Log in", username/password fields, Log in and Cancel buttons, and Register link to /register.
    it('renders dialog with title, inputs, and actions when open', () => {
        renderLoginPopup({ isOpen: true });
        expect(screen.getByRole('dialog', { name: 'Login' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument();
        const registerLink = screen.getByRole('link', { name: 'Register' });
        expect(registerLink).toHaveAttribute('href', '/register');
    });

    // The optional error prop is rendered in an alert so the user sees validation or API error messages.
    it('shows error alert when error prop is passed', () => {
        renderLoginPopup({ isOpen: true, error: 'Invalid credentials' });
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Invalid credentials');
    });

    // Clicking the backdrop overlay should close the popup via the onClose callback.
    it('calls onClose when overlay is clicked', () => {
        const onClose = jest.fn();
        renderLoginPopup({ isOpen: true, onClose });
        const overlay = document.querySelector('.login-popup-overlay');
        fireEvent.click(overlay ?? document.body);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // The × close button in the header should trigger onClose.
    it('calls onClose when close button is clicked', () => {
        const onClose = jest.fn();
        renderLoginPopup({ isOpen: true, onClose });
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // The Cancel button next to Log in should trigger onClose without submitting.
    it('calls onClose when Cancel is clicked', () => {
        const onClose = jest.fn();
        renderLoginPopup({ isOpen: true, onClose });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // Submitting the form calls onSubmit with { username, password } and the component clears both inputs.
    it('calls onSubmit with username and password and clears inputs after submit', () => {
        const onSubmit = jest.fn();
        renderLoginPopup({ isOpen: true, onSubmit });
        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'vincent' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ username: 'vincent', password: 'secret' });
        expect(screen.getByLabelText('Username')).toHaveValue('');
        expect(screen.getByLabelText('Password')).toHaveValue('');
    });

    // Clicking the Register link closes the popup (onClose) so the user can navigate to /register.
    it('calls onClose when Register link is clicked', () => {
        const onClose = jest.fn();
        renderLoginPopup({ isOpen: true, onClose });
        fireEvent.click(screen.getByRole('link', { name: 'Register' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
