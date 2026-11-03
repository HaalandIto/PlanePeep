/**
 * Favorites page and normalizeFavoriteListItem (favorites domain only).
 */
import type { ComponentProps } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Favorites from './Favorites';
import {
    getFavorites,
    deleteFavorite,
    patchFavoriteName,
    patchFavoriteOrder,
    normalizeFavoriteListItem,
} from '../api';

jest.mock('../api', () => ({
    __esModule: true,
    ...jest.requireActual('../api'),
    getFavorites: jest.fn(),
    deleteFavorite: jest.fn(),
    patchFavoriteName: jest.fn(),
    patchFavoriteOrder: jest.fn(),
}));

const mockedGet = getFavorites as jest.MockedFunction<typeof getFavorites>;
const mockedDelete = deleteFavorite as jest.MockedFunction<typeof deleteFavorite>;
const mockedPatchName = patchFavoriteName as jest.MockedFunction<typeof patchFavoriteName>;
const mockedPatchOrder = patchFavoriteOrder as jest.MockedFunction<typeof patchFavoriteOrder>;

const sampleA = {
    favoriteId: 10,
    name: 'Bird',
    typecode: 'B738',
    externalItemId: 'N700AA',
    tailNumber: null as string | null,
    sortOrder: 0,
    updatedAt: '',
    createdAt: '',
};

const sampleB = {
    favoriteId: 11,
    name: 'Second',
    typecode: 'A320',
    externalItemId: 'ext-99',
    tailNumber: null as string | null,
    sortOrder: 1,
    updatedAt: '',
    createdAt: '',
};

function renderFavorites(props: ComponentProps<typeof Favorites> = { token: null }) {
    return render(
        <MemoryRouter>
            <Favorites {...props} />
        </MemoryRouter>,
    );
}

describe('normalizeFavoriteListItem', () => {
    it('returns null for non-objects and rows without id', () => {
        expect(normalizeFavoriteListItem(null)).toBeNull();
        expect(normalizeFavoriteListItem([])).toBeNull();
        expect(normalizeFavoriteListItem({})).toBeNull();
    });

    it('maps snake_case aliases', () => {
        expect(
            normalizeFavoriteListItem({
                favoriteId: 2,
                display_name: 'My jet',
                aircraft_type_code: 'A320',
                external_item_id: 'abcdef',
                tail_number: 'N99ZZ',
                sortOrder: 1,
                updated_at: 'Apr 1',
            }),
        ).toEqual({
            favoriteId: 2,
            name: 'My jet',
            sortOrder: 1,
            externalItemId: 'abcdef',
            typecode: 'A320',
            tailNumber: 'N99ZZ',
            updatedAt: 'Apr 1',
            createdAt: '',
        });
    });
});

describe('Favorites page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGet.mockResolvedValue([]);
        mockedDelete.mockResolvedValue({});
        mockedPatchName.mockResolvedValue({});
        mockedPatchOrder.mockResolvedValue({});
    });

    it('does not call getFavorites when token is missing', async () => {
        renderFavorites({ token: null });
        await waitFor(() => {
            expect(mockedGet).not.toHaveBeenCalled();
        });
    });

    it('calls getFavorites with JWT when token is set and renders items', async () => {
        mockedGet.mockResolvedValueOnce([sampleA, sampleB]);
        renderFavorites({ token: 'my-jwt' });
        await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('my-jwt'));
        expect(await screen.findByText('Bird')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('ICAO N700AA · B738')).toBeInTheDocument();
    });

    it('shows load error when getFavorites rejects', async () => {
        mockedGet.mockRejectedValueOnce(new Error('unauthorized'));
        renderFavorites({ token: 'bad' });
        expect(await screen.findByRole('alert')).toHaveTextContent('unauthorized');
    });

    it('Remove calls deleteFavorite with id and token', async () => {
        mockedGet.mockResolvedValueOnce([sampleA]);
        renderFavorites({ token: 't' });
        await screen.findByText('Bird');
        fireEvent.click(screen.getByRole('button', { name: /remove/i }));
        await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('10', 't'));
    });

    it('Rename calls patchFavoriteName on blur', async () => {
        mockedGet.mockResolvedValueOnce([sampleA]);
        renderFavorites({ token: 't' });
        await screen.findByText('Bird');
        fireEvent.click(screen.getByRole('button', { name: /rename/i }));
        const input = screen.getByRole('textbox', { name: /favorite name/i });
        fireEvent.change(input, { target: { value: 'Eagle' } });
        fireEvent.blur(input);
        await waitFor(() => expect(mockedPatchName).toHaveBeenCalledWith(10, 'Eagle', 't'));
    });

    it('Move up calls patchFavoriteOrder then refetches list', async () => {
        mockedGet
            .mockResolvedValueOnce([sampleA, sampleB])
            .mockResolvedValueOnce([sampleA, sampleB])
            .mockResolvedValueOnce([sampleB, sampleA]);
        renderFavorites({ token: 't' });
        await screen.findByText('Bird');
        const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
        expect(moveUpButtons.length).toBeGreaterThanOrEqual(2);
        fireEvent.click(moveUpButtons[1] as HTMLButtonElement);
        await waitFor(() => expect(mockedPatchOrder).toHaveBeenCalledWith(11, 'up', 't'));
        await waitFor(() => expect(mockedGet.mock.calls.length).toBeGreaterThanOrEqual(2));
    });

    it('search from title uses registration when present', async () => {
        const onSearch = jest.fn();
        mockedGet.mockResolvedValueOnce([sampleA]);
        renderFavorites({ token: 't', onSearchFromCardTitle: onSearch });
        await screen.findByText('Bird');
        fireEvent.click(screen.getByRole('button', { name: 'Bird' }));
        expect(onSearch).toHaveBeenCalledWith('N700AA');
    });
});
