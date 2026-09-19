import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Moon, Sun, Plus, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="glass-card" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 1000 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
        
        {/* Brand Logo */}
        <Link to={isAuthenticated ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Activity size={22} />
          </div>
          <span>Pulse<span style={{ color: 'var(--accent-primary)' }}>Vote</span></span>
        </Link>

        {/* Right Navigation & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
          >
            {theme === 'dark' ? <Sun size={18} style={{ color: '#f59e0b' }} /> : <Moon size={18} style={{ color: '#6366f1' }} />}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: location.pathname === '/dashboard' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                }}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              <Link
                to="/create-poll"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Plus size={18} />
                Create Poll
              </Link>

              {/* User Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  <UserIcon size={18} />
                  <span>{user?.name}</span>
                </button>

                {dropdownOpen && (
                  <div
                    className="glass-card"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '45px',
                      width: '200px',
                      padding: '8px 0',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100
                    }}
                  >
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{user?.email}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        color: 'var(--accent-danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    >
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/login"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Log In
              </Link>

              <Link
                to="/register"
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                Get Started
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
