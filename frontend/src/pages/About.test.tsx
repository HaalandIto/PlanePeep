/**
 * Unit tests for the About page (src/pages/About.tsx).
 *
 * Verifies that the About page renders all expected content: page title, tagline,
 * navigation, and each content section (Current experience, Who this app is for,
 * Accounts and favorites, Technology, Flight data). Also checks layout (root CSS class) and external link
 * attributes (Flight Aware).
 *
 * Run with: npm run test:run (single run) or npm run test (watch mode).
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from './About';

/**
 * Renders the About page inside MemoryRouter so that React Router's Link component
 * works in tests without a full router. Use this in each test that needs the About UI.
 */
function renderAbout() {
    return render(
        <MemoryRouter>
            <About />
        </MemoryRouter>,
    );
}

describe('About', () => {
    it('renders the page title Plane Peep', () => {
        renderAbout();
        expect(screen.getByRole('heading', { level: 1, name: 'Plane Peep' })).toBeInTheDocument();
    });

    it('renders the tagline built by team t_18', () => {
        renderAbout();
        expect(screen.getByText(/Built by team t_18\./)).toBeInTheDocument();
    });

    it('renders a Back link to home', () => {
        renderAbout();
        const backLink = screen.getByRole('link', { name: /← Back/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/');
    });

    it('renders the Current experience section', () => {
        renderAbout();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Current experience' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/home page shows aircraft in the current map viewport/i),
        ).toBeInTheDocument();
    });

    it('renders the Who this app is for section', () => {
        renderAbout();
        // Target audience terms appear inside <strong>; assert each term separately.
        expect(
            screen.getByRole('heading', { level: 2, name: 'Who this app is for' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/travelers/i)).toBeInTheDocument();
        expect(screen.getByText(/aviation enthusiasts/i)).toBeInTheDocument();
        expect(screen.getByText(/quick visibility into live traffic/i)).toBeInTheDocument();
    });

    it('renders the Accounts and favorites section', () => {
        renderAbout();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Accounts and favorites' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Login is optional\./)).toBeInTheDocument();
        expect(screen.getByText(/Reordering saved flights/)).toBeInTheDocument();
    });

    it('renders the Technology section with expected items', () => {
        renderAbout();
        expect(screen.getByRole('heading', { level: 2, name: 'Technology' })).toBeInTheDocument();
        expect(screen.getByText('React 19 + TypeScript + Vite')).toBeInTheDocument();
        expect(screen.getByText('MySQL')).toBeInTheDocument();
        expect(screen.getByText('Java 21 + Spring Boot + Spring Security')).toBeInTheDocument();
        expect(screen.getByText(/JUnit/)).toBeInTheDocument();
        expect(screen.getByText('JWT authentication')).toBeInTheDocument();
    });

    it('renders the Flight data section and OpenSky link', () => {
        renderAbout();
        expect(screen.getByRole('heading', { level: 2, name: 'Flight data' })).toBeInTheDocument();
        expect(screen.getByText(/Live positions and metadata are fetched/i)).toBeInTheDocument();
        const openSkyLink = screen.getByRole('link', { name: "OpenSky's" });
        expect(openSkyLink).toBeInTheDocument();
        expect(openSkyLink).toHaveAttribute(
            'href',
            'https://openskynetwork.github.io/opensky-api/java.html',
        );
        expect(openSkyLink).toHaveAttribute('target', '_blank');
        expect(openSkyLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('uses app-page class on the root container', () => {
        const { container } = renderAbout();
        const root = container.querySelector('.app-page');
        expect(root).toBeInTheDocument();
    });
});
