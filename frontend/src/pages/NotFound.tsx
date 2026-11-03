import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className='app-page'>
            <div className='app-page__content'>
                <nav className='app-page__nav'>
                    <Link to='/' className='app-page__nav-link'>
                        ← Back
                    </Link>
                </nav>
                <h1 className='app-page__title'>404</h1>
                <p className='app-page__tagline'>Page not found.</p>
                <section className='app-page__section'>
                    <p>
                        The page you're looking for doesn't exist. Try the{' '}
                        <Link to='/'>home page</Link> or <Link to='/about'>About</Link>.
                    </p>
                </section>
            </div>
        </div>
    );
}
