import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import { postAuthRegister, postAuthLogin } from '../api';
import type { AuthResponse } from '../api';

/** Optional callback when registration + follow-up login succeed (e.g. store tokens in parent). */
interface RegisterProps {
    onAuthSuccess?: (auth: AuthResponse) => void;
}

/** Registration page: creates the user, then logs in so the app has a session without a second manual sign-in. */
export default function Register({ onAuthSuccess }: RegisterProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    /**
     * Async registration flow (order matters):
     * 1. POST register — creates the account on the server.
     * 2. POST login — exchanges credentials for tokens/session used by the rest of the app.
     * 3. Notify parent, then navigate home. `void navigate` documents we intentionally
     *    ignore the Promise (React Router v6+); errors are not surfaced from navigation here.
     */
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await postAuthRegister({ username, password });
            const auth = await postAuthLogin({ username, password });
            onAuthSuccess?.(auth);
            void navigate('/');
        } catch (err) {
            setError((err as Error).message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className='app-page'>
            <div className='app-page__content'>
                <nav className='app-page__nav'>
                    <Link to='/' className='app-page__nav-link'>
                        ← Back
                    </Link>
                </nav>
                <h1 className='app-page__title'>Create an account</h1>
                {error && (
                    <div className='alert alert-danger' role='alert'>
                        {error}
                    </div>
                )}

                <Form
                    onSubmit={(e) => {
                        // Fire-and-forget: async handler; void avoids floating-Promise lint noise.
                        void handleSubmit(e);
                    }}
                    className='app-page__form'
                >
                    <Form.Group className='mb-2' controlId='register-username'>
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type='text'
                            placeholder='Username'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete='username'
                        />
                    </Form.Group>
                    <Form.Group className='mb-3' controlId='register-password'>
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type='password'
                            placeholder='At least 6 characters'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete='new-password'
                        />
                    </Form.Group>
                    <Button
                        variant='primary'
                        type='submit'
                        className='app-page__form-submit'
                        disabled={submitting}
                    >
                        {submitting ? 'Creating…' : 'Create account'}
                    </Button>
                </Form>
            </div>
        </div>
    );
}
