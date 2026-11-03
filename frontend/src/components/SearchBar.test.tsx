/**
 * Unit tests for SearchBar (src/components/SearchBar.tsx).
 */

import { render, screen, fireEvent, within, act, cleanup } from '@testing-library/react';
import SearchBar from './SearchBar';
import { AircraftPosition } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPlanes: AircraftPosition[] = [
    {
        icao24: 'ABC123',
        callsign: 'UAL123',
        originCountry: 'United States',
        longitude: -90,
        latitude: 40,
        baroAltitude: 10000,
        velocity: 250,
        trueTrack: 180,
        verticalRate: 0,
        onGround: false,
    },
    {
        icao24: 'DEF456',
        callsign: 'DLH456',
        originCountry: 'Germany',
        longitude: 10,
        latitude: 52,
        baroAltitude: 12000,
        velocity: 280,
        trueTrack: 90,
        verticalRate: 0,
        onGround: false,
    },
    {
        icao24: 'GHI789',
        callsign: null,
        originCountry: 'Canada',
        longitude: -75,
        latitude: 45,
        baroAltitude: 8000,
        velocity: 200,
        trueTrack: 270,
        verticalRate: 0,
        onGround: false,
    },
];

function renderSearchBar(props: Record<string, unknown> = {}) {
    act(() => {
        render(<SearchBar onSearch={jest.fn()} planeLocationData={mockPlanes} {...props} />);
    });
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((msg, ...args) => {
        if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
        console.error(msg, ...args);
    });
});

afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

// Simulate a full typeahead selection.
// react-bootstrap-typeahead listens to mousedown to commit a selection
function selectAndSubmit(icao24: string) {
    const input = screen.getByRole('combobox');

    act(() => {
        fireEvent.change(input, { target: { value: icao24.slice(0, 3) } });
    });

    const menu = screen.getByRole('listbox');
    const item = within(menu).getByText(icao24.toUpperCase(), { exact: false });

    act(() => {
        fireEvent.mouseDown(item);
        fireEvent.click(item);
    });

    act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchBar', () => {
    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    it('renders the combobox input and Search button', () => {
        renderSearchBar();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    // ------------------------------------------------------------------
    // Typeahead suggestions
    // ------------------------------------------------------------------

    it('shows suggestions after typing the minimum number of characters', () => {
        renderSearchBar();

        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'AB' } });
        });

        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('does not show suggestions before the minimum character threshold', () => {
        renderSearchBar();

        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'A' } });
        });

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('filters suggestions by icao24', () => {
        renderSearchBar();

        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ABC' } });
        });

        const menu = screen.getByRole('listbox');
        expect(within(menu).getByText(/ABC123/i)).toBeInTheDocument();
        expect(within(menu).queryByText(/DEF456/i)).not.toBeInTheDocument();
    });

    it('filters suggestions by callsign', () => {
        renderSearchBar();

        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'UAL' } });
        });

        expect(within(screen.getByRole('listbox')).getByText(/UAL123/i)).toBeInTheDocument();
    });

    it('filters suggestions by originCountry', () => {
        renderSearchBar();

        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Ger' } });
        });

        expect(within(screen.getByRole('listbox')).getByText(/Germany/i)).toBeInTheDocument();
    });

    // ------------------------------------------------------------------
    // Submission — happy path
    // ------------------------------------------------------------------

    it('calls onSearch with lowercased, trimmed icao24 after selecting a suggestion', () => {
        const onSearch = jest.fn();
        renderSearchBar({ onSearch });

        selectAndSubmit('ABC123');

        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('abc123');
    });

    it('clears the input after a successful submission', () => {
        renderSearchBar();

        selectAndSubmit('ABC123');

        expect(screen.getByRole('combobox')).toHaveValue('');
    });

    // ------------------------------------------------------------------
    // Submission — guard cases
    // ------------------------------------------------------------------

    it('does not call onSearch when the combobox is empty', () => {
        const onSearch = jest.fn();
        renderSearchBar({ onSearch });

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        });

        expect(onSearch).not.toHaveBeenCalled();
    });

    it('does not call onSearch when text is typed but no suggestion is selected', () => {
        const onSearch = jest.fn();
        renderSearchBar({ onSearch });

        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ABC' } });
        });
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Search' }));
        });

        expect(onSearch).not.toHaveBeenCalled();
    });
});
