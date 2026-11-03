import { render, screen, fireEvent } from '@testing-library/react';
import PlaneInfoModal from './PlaneInfoModal';

jest.mock('../api', () => ({
    postFavorites: jest.fn(),
}));

describe('PlaneInfoModal', () => {
    it('renders the dialog when open', () => {
        const noop = () => {};
        render(
            <PlaneInfoModal
                show={true}
                handleClose={noop}
                plane={{ icao24: 'abc123', callsign: 'UAL1' }}
                user={{ userId: 1, username: 'tester' }}
                token={null}
                setLoginPopupOpen={noop}
            />,
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays a Favorite button on the modal', () => {
        const noop = () => {};
        render(
            <PlaneInfoModal
                show={true}
                handleClose={noop}
                plane={{ icao24: 'abc123', callsign: 'UAL1' }}
                user={{ userId: 1, username: 'tester' }}
                token={null}
                setLoginPopupOpen={noop}
            />,
        );
        expect(screen.getByRole('button', { name: 'Favorite' })).toBeInTheDocument();
    });

    it('closes the modal when clicking outside of it', () => {
        const handleClose = jest.fn();
        render(
            <PlaneInfoModal
                show={true}
                handleClose={handleClose}
                plane={{ icao24: 'abc123', callsign: 'UAL1' }}
                user={{ userId: 1, username: 'tester' }}
                token={null}
                setLoginPopupOpen={() => {}}
            />,
        );

        // Click on the close button (X) in the modal header
        const closeButton = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeButton);

        expect(handleClose).toHaveBeenCalled();
    });

    it('does not show modal when show prop is false', () => {
        const noop = () => {};
        render(
            <PlaneInfoModal
                show={false}
                handleClose={noop}
                plane={{ icao24: 'abc123', callsign: 'UAL1' }}
                user={{ userId: 1, username: 'tester' }}
                token={null}
                setLoginPopupOpen={noop}
            />,
        );

        // Check that the modal dialog is not in the document
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
