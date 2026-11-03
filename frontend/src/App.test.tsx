/**
 * Unit tests for the root App component (src/App.tsx).
 *
 * Covers:
 * - Routing: home (/), /about, /favorites, and 404 for unknown paths
 * - Navigation bar presence and nav links
 * - Login / logout flow (user state and UI updates)
 *
 * Auth tests were rewritten for the new implementation: we mock ./api (postAuthLogin only, so
 * api.test.ts still gets the real module) and complete the full login flow - open popup, fill
 * username/password, submit - so that "shows username and Logout after login" and "shows Login
 * again after logout" are deterministic. A new test "shows error in popup and keeps Login visible
 * when login fails" covers the error path.
 *
 * Map is mocked to avoid Google Maps and env in tests. Run with:
 *   npm run test:run   (single run)
 *   npm run test       (watch mode)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { postAuthLogin, getAuthMe } from './api';

jest.mock('./components/Map', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: function MockMap() {
            return React.createElement('div', { 'data-testid': 'mock-map' }, 'Map');
        },
    };
});

jest.mock('./api', () => ({
    ...jest.requireActual('./api'),
    postAuthLogin: jest.fn(),
    getAuthMe: jest.fn(),
}));

/**
 * Pre-test setup for App tests:
 * - Map is mocked so we avoid loading Google Maps and env in tests; home route renders a simple placeholder div.
 * - ./api is partially mocked: only postAuthLogin is replaced with jest.fn(); the rest of the module is real so api.test.ts still passes. Auth tests then control login success/failure via postAuthLogin.mockResolvedValueOnce / mockRejectedValueOnce.
 */
/** Renders the full App with its internal BrowserRouter for integration-style tests (routing, nav, login/logout). */
function renderApp() {
    return render(<App />);
}

describe('App', () => {
    describe('routing', () => {
        // Home route shows the Map component (mocked here as a simple div).
        it('renders home (Map) at /', () => {
            window.history.pushState({}, '', '/');
            renderApp();
            expect(screen.getByTestId('mock-map')).toBeInTheDocument();
            expect(screen.getByText('Map')).toBeInTheDocument();
        });

        // Clicking the About nav link shows the About page with its heading.
        it('renders About page when navigating to /about', () => {
            window.history.pushState({}, '', '/');
            renderApp();
            // Nav uses Button as={NavLink}, so these show as role="button" in the a11y tree
            const aboutNav = screen.getByRole('button', { name: /about/i });
            fireEvent.click(aboutNav);
            expect(
                screen.getByRole('heading', { level: 1, name: 'Plane Peep' }),
            ).toBeInTheDocument();
        });

        // Clicking the Favorites nav link shows the Favorites page with its heading.
        it('renders Favorites page when navigating to /favorites', () => {
            window.history.pushState({}, '', '/');
            renderApp();
            const favoritesNav = screen.getByRole('button', { name: /favorites/i });
            fireEvent.click(favoritesNav);
            expect(
                screen.getByRole('heading', { level: 1, name: 'Favorites' }),
            ).toBeInTheDocument();
        });

        // Any path that does not match a route shows the 404 (NotFound) page.
        it('renders NotFound (404) for unknown path', () => {
            window.history.pushState({}, '', '/unknown');
            renderApp();
            expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
            expect(screen.getByText(/page not found/i)).toBeInTheDocument();
        });
    });

    describe('navigation bar', () => {
        // Navbar on home includes Favorites and About links.
        it('shows navbar with Favorites and About nav items on home', () => {
            window.history.pushState({}, '', '/');
            renderApp();
            expect(screen.getByRole('button', { name: /favorites/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /about/i })).toBeInTheDocument();
        });

        // Logo image is present and its wrapping link points to /.
        it('shows Plane Peep logo linking to home', () => {
            window.history.pushState({}, '', '/');
            renderApp();
            const logo = screen.getByAltText('Plane Peep Logo');
            expect(logo).toBeInTheDocument();
            const brandLink = logo.closest('a');
            expect(brandLink).toHaveAttribute('href', '/');
        });
    });

    describe('auth (login / logout)', () => {
        beforeEach(() => {
            (postAuthLogin as jest.Mock).mockReset();
            (getAuthMe as jest.Mock).mockReset();
            localStorage.clear();
        });

        it('shows Login when user is not logged in', () => {
            window.history.pushState({}, '', '/');
            renderApp();
            expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
        });

        // REWRITTEN: Open popup, fill credentials, submit; mock postAuthLogin to resolve with user; assert username and Logout are visible and API was called with credentials.
        it('shows username and Logout after login', async () => {
            (postAuthLogin as jest.Mock).mockResolvedValueOnce({
                userId: 1,
                username: 'vincent',
                token: 'jwt-login',
            });
            window.history.pushState({}, '', '/');
            renderApp();
            fireEvent.click(screen.getByRole('button', { name: /login/i }));
            fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'vincent' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
            fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
            expect(await screen.findByText('vincent')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
            expect(postAuthLogin).toHaveBeenCalledWith({ username: 'vincent', password: 'secret' });
            expect(localStorage.getItem('authToken')).toBe('jwt-login');
        });

        // REWRITTEN: Same login flow as above, then click Logout; assert Login button is back and username is gone.
        it('shows Login again after logout', async () => {
            (postAuthLogin as jest.Mock).mockResolvedValueOnce({
                userId: 1,
                username: 'vincent',
                token: 'jwt-login',
            });
            window.history.pushState({}, '', '/');
            renderApp();
            fireEvent.click(screen.getByRole('button', { name: /login/i }));
            fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'vincent' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
            fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
            expect(await screen.findByText('vincent')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: /logout/i }));
            expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
            expect(screen.queryByText('vincent')).not.toBeInTheDocument();
            expect(localStorage.getItem('authToken')).toBeNull();
        });

        // NEW: Mock postAuthLogin to reject; submit login form; assert error alert in popup, dialog still open, and navbar still shows Login.
        it('shows error in popup and keeps Login visible when login fails', async () => {
            (postAuthLogin as jest.Mock).mockRejectedValueOnce(new Error('invalid credentials'));
            window.history.pushState({}, '', '/');
            renderApp();
            fireEvent.click(screen.getByRole('button', { name: /login/i }));
            fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
            fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
            expect(await screen.findByRole('alert')).toHaveTextContent('invalid credentials');
            expect(screen.getByRole('dialog', { name: 'Login' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
        });

        it('hydrates user from stored token on app start', async () => {
            localStorage.setItem('authToken', 'stored-jwt');
            (getAuthMe as jest.Mock).mockResolvedValueOnce({
                userId: 1,
                username: 'restored-user',
                token: 'stored-jwt',
            });
            window.history.pushState({}, '', '/');
            renderApp();
            expect(await screen.findByText('restored-user')).toBeInTheDocument();
            expect(getAuthMe).toHaveBeenCalledWith('stored-jwt');
        });
    });
});
