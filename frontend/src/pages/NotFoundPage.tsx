import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '40px 24px' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent-primary)', marginBottom: '8px' }}>404</h1>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Page Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            to="/"
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              color: 'white',
              fontWeight: 600,
              display: 'inline-block'
            }}
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};
