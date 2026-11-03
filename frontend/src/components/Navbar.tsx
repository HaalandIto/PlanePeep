/**
 * NavigationBar — app header with logo, nav links (Favorites, About), centered SearchBar, and auth (Login/Logout).
 * No asynchronous calls in this component; auth and search are delegated to parent via callbacks.
 */
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import SearchBar from './SearchBar';
import logo from '../assets/logo.png';
import { AircraftPosition } from '../api';

interface NavigationBarProps {
    onSearchTailNumber?: (tail: string) => void;
    planeLocationData?: AircraftPosition[];
    user?: { username?: string } | null;
    onLogin?: () => void;
    onLogout?: () => void;
}

/**
 * Renders the main app navbar. Search and auth are controlled by the parent (e.g. App).
 * @param {Object} props
 * @param {(tail: string) => void} [props.onSearchTailNumber] - Passed to SearchBar; called when user submits a tail search (parent may do async lookup).
 * @param {AircraftPosition[]} [props.planeLocationData] - Plane location data used by SearchBar for autocomplete suggestions.
 * @param {{ username?: string } | null} [props.user] - Current user object when logged in; null when not authenticated.
 * @param {() => void} [props.onLogin] - Called when user clicks Login. TODO: Connect to backend auth (e.g. OAuth or login API); may become async.
 * @param {() => void} [props.onLogout] - Called when user clicks Logout. TODO: Connect to backend to invalidate session; may become async.
 */
export default function NavigationBar({
    onSearchTailNumber,
    planeLocationData,
    user,
    onLogin,
    onLogout,
}: NavigationBarProps) {
    return (
        <Navbar expand className='app-navbar px-3'>
            <Container fluid className='position-relative'>
                <Navbar.Brand as={NavLink} to='/' className='d-flex align-items-center me-4'>
                    <img src={logo} alt='Plane Peep Logo' height='42' />
                </Navbar.Brand>

                <Navbar.Collapse id='main-navbar'>
                    <Nav className='me-auto align-items-center gap-2'>
                        <Button
                            as={NavLink as unknown as any}
                            to='/favorites'
                            variant='primary'
                            size='sm'
                            className='text-decoration-none'
                        >
                            Favorites
                        </Button>
                        <Button
                            as={NavLink as unknown as any}
                            to='/about'
                            variant='primary'
                            size='sm'
                            className='text-decoration-none'
                        >
                            About
                        </Button>
                    </Nav>

                    <div className='flex-grow-1' aria-hidden='true' />

                    <div className='navbar-search-center position-absolute top-0 start-50 translate-middle-x d-flex align-items-center'>
                        <SearchBar
                            onSearch={onSearchTailNumber}
                            planeLocationData={planeLocationData}
                        />
                    </div>

                    <div className='d-flex align-items-center gap-2 ms-auto'>
                        {user ? (
                            <>
                                <span className='fw-semibold'>{user.username}</span>

                                <Button variant='outline-secondary' size='sm' onClick={onLogout}>
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <Button variant='primary' size='sm' onClick={onLogin}>
                                Login
                            </Button>
                        )}
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
