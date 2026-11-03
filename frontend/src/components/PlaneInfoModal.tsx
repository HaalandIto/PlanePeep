import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { postFavorites } from '../api';
import { AircraftMetadata } from '../App';

interface PlaneInfoModalProps {
    show: boolean;
    handleClose: () => void;
    plane: AircraftMetadata;
    user: { userId: number; username: string } | null;
    token: string | null;
    setLoginPopupOpen: (open: boolean) => void;
}

function PlaneInfoModal({
    show,
    handleClose,
    plane,
    user,
    token,
    setLoginPopupOpen,
}: PlaneInfoModalProps) {
    const [favoriteMessage, setFavoriteMessage] = useState('');

    const handleFavorite = () => {
        // If user is not logged in, redirect to login
        if (!user) {
            handleClose();
            setLoginPopupOpen(true);
            return;
        }

        // Use ICAO24 as the unique identifier for favorites
        const id = plane?.icao24;

        if (id) {
            void postFavorites(
                {
                    externalItemId: id,
                    typecode: plane?.typecode,
                    tailNumber: plane?.registration,
                },
                token,
            )
                .then(() => {
                    // Use callsign if available, otherwise fall back to ICAO24.
                    const label = plane?.callsign != null ? String(plane.callsign) : id;
                    setFavoriteMessage(`${label} added to favorites list`);
                })
                .catch((e) => {
                    alert(`Failed to add to favorites: ${(e as Error).message}`);
                });
        }
    };

    // display:
    // Coordinates,
    // Tail Number,
    // Callsign/Airline,
    // Origin/Destination,
    // ICAO24,
    // Airframe Model, and
    // Last Updated timestamp.
    return plane ? (
        <div>
            <Modal
                show={show}
                onHide={() => {
                    setFavoriteMessage('');
                    handleClose();
                }}
                centered
                dialogClassName='plane-modal'
            >
                <Modal.Header closeButton>
                    <Modal.Title>{plane.callsign ? plane.callsign : 'Plane Info'}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <table>
                        <tbody>
                            {plane.icao24 ? (
                                <tr>
                                    <th>ICAO24</th>
                                    <td>{plane.icao24}</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.registration ? (
                                <tr>
                                    <th>Registration</th>
                                    <td>{plane.registration}</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.isObscured != null && plane.isObscured === true ? (
                                <tr>
                                    <th style={{ color: 'red' }}>Obscured</th>
                                    <td>This plane is hiding its registration.</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.originCountry ? (
                                <tr>
                                    <th>Country of Origin</th>
                                    <td>{plane.originCountry}</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.typecode ? (
                                <tr>
                                    <th>Model</th>
                                    <td>{plane.typecode}</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.owner ? (
                                <tr>
                                    <th>Owner</th>
                                    <td>{plane.owner}</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.latitude && plane.longitude != null ? (
                                <tr>
                                    <th>Lat Long</th>
                                    <td>
                                        {plane.latitude.toFixed(5)}, {plane.longitude.toFixed(5)}
                                    </td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.altitude != null ? (
                                <tr>
                                    <th>Altitude</th>
                                    <td>{plane.altitude} m</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.velocity != null ? (
                                <tr>
                                    <th>Velocity</th>
                                    <td>{plane.velocity} m/s</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.heading != null ? (
                                <tr>
                                    <th>Heading</th>
                                    <td>{plane.heading}</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.verticalRate != null ? (
                                <tr>
                                    <th>Vertical Rate</th>
                                    <td>{plane.verticalRate} m/s</td>
                                </tr>
                            ) : (
                                <></>
                            )}

                            {plane.lastUpdated ? (
                                <tr>
                                    <th>Last Updated</th>
                                    <td>
                                        {new Date(plane.lastUpdated * 1000).toLocaleTimeString()}{' '}
                                        UTC
                                        {new Date(plane.lastUpdated * 1000).getTimezoneOffset() /
                                            -60}
                                    </td>
                                </tr>
                            ) : (
                                <></>
                            )}
                        </tbody>
                    </table>
                </Modal.Body>

                <Modal.Footer>
                    {favoriteMessage ? (
                        <span style={{ color: 'green', marginRight: '8px' }}>
                            {favoriteMessage}
                        </span>
                    ) : null}
                    <Button onClick={handleFavorite}>Favorite</Button>
                </Modal.Footer>
            </Modal>
        </div>
    ) : (
        <div />
    );
}

export default PlaneInfoModal;
