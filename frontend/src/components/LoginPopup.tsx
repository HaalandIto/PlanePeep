import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';

/**
 * Login popup shown at top-right below the navbar.
 * @param { boolean } props.isOpen - Whether the popup is visible
 * @param { () => void } props.onClose - Called when user closes the popup (e.g. overlay or X)
 * @param { (credentials: { username: string, password: string }) => void } props.onSubmit - Called with form data on submit
 * @param { string } [props.error] - Error message to display (e.g. invalid credentials)
 */
interface LoginPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (credentials: { username: string; password: string }) => void;
    error?: string;
}

export default function LoginPopup({ isOpen, onClose, onSubmit, error }: LoginPopupProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    /**
     * Sync submit handler: prevents full-page navigation, forwards credentials to the parent.
     * The parent may run async work (e.g. API login); this component does not await it.
     * Clears fields after calling onSubmit so the popup does not keep stale passwords open.
     */
    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        onSubmit({ username, password });
        setUsername('');
        setPassword('');
    }

    if (!isOpen) return null;

    return (
        <>
            <div className='login-popup-overlay' onClick={onClose} aria-hidden='true' />
            <div className='login-popup' role='dialog' aria-label='Login'>
                <div className='login-popup-header'>
                    <h5 className='login-popup-title'>Log in</h5>
                    <button
                        type='button'
                        className='login-popup-close'
                        onClick={onClose}
                        aria-label='Close'
                    >
                        ×
                    </button>
                </div>
                <Form onSubmit={handleSubmit} className='login-popup-form'>
                    {error && (
                        <div className='alert alert-danger mb-2' role='alert'>
                            {error}
                        </div>
                    )}

                    <Form.Group className='mb-2' controlId='login-username'>
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type='text'
                            placeholder='Username'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete='username'
                        />
                    </Form.Group>
                    <Form.Group className='mb-3' controlId='login-password'>
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type='password'
                            placeholder='Password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete='current-password'
                        />
                    </Form.Group>
                    <div className='login-popup-actions'>
                        <Button variant='primary' type='submit' size='sm'>
                            Log in
                        </Button>
                        <Button
                            variant='outline-secondary'
                            type='button'
                            size='sm'
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                    </div>
                    <p className='login-popup-register'>
                        Don&apos;t have an account?{' '}
                        <Link
                            to='/register'
                            className='login-popup-register-link'
                            onClick={onClose}
                        >
                            Register
                        </Link>
                    </p>
                </Form>
            </div>
        </>
    );
}
