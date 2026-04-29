import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Home, User, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../styles/components/Header.css';

const Header = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const { isAuthenticated, userType, logout, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsOpen(false);
    };

    const getDashboardLink = () => {
        return userType === 'admin' ? '/admin' : '/polling-unit';
    };

    const getUserTypeLabel = () => {
        if (userType === 'admin') return 'Admin';
        if (userType === 'polling-unit') return 'Polling Unit';
        return null;
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    {/* Logo with User Type Badge */}
                    <Link to={isAuthenticated ? getDashboardLink() : '/'} className="header-logo">
                        <div className="logo-icon">
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={24} /></span>
                        </div>
                        <div className="logo-text">
                            <span className="logo-title">Poll Watch</span>
                            <span className="logo-subtitle">Election Results Platform</span>
                            {isAuthenticated && getUserTypeLabel() && (
                                <span className="user-type-badge">{getUserTypeLabel()}</span>
                            )}
                        </div>
                    </Link>

                    {/* Polling Unit Info - Show when polling unit user is logged in */}
                    {isAuthenticated && userType === 'polling-unit' && user && (
                        <div className="polling-unit-info">
                            <div className="pu-detail">
                                <span className="pu-icon"><MapPin size={16} /></span>
                                <span className="pu-value">{user.unit_id}</span>
                                <span className="pu-label">Unit ID</span>
                            </div>
                            <div className="pu-detail">
                                <span className="pu-icon"><Home size={16} /></span>
                                <span className="pu-value">{user.name}</span>
                            </div>
                            <div className="pu-detail">
                                <span className="pu-icon"><MapPin size={16} /></span>
                                <span className="pu-value">{user.lga_name || 'LGA'}</span>
                            </div>
                            {/* Mobile Logout Button for Polling Unit */}
                            <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={handleLogout}
                                style={{
                                    padding: '0.35rem 0.7rem',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginLeft: '8px'
                                }}
                                title="Logout"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}

                    {/* Navigation - Desktop */}
                    <nav className="header-nav desktop-nav">
                        {/* Show Results link only when not authenticated */}
                        {!isAuthenticated && (
                            <Link
                                to="/"
                                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                            >
                                Results
                            </Link>
                        )}

                        {/* Show Dashboard link when authenticated */}
                        {isAuthenticated && (
                            <Link
                                to={getDashboardLink()}
                                className={`nav-link ${isActive(getDashboardLink()) ? 'active' : ''}`}
                            >
                                <Home size={16} />
                                Dashboard
                            </Link>
                        )}

                        {!isAuthenticated && (
                            <>
                                <Link
                                    to="/admin-login"
                                    className={`nav-link ${isActive('/admin-login') ? 'active' : ''}`}
                                >
                                    Admin
                                </Link>
                                <Link
                                    to="/polling-unit-login"
                                    className={`nav-link ${isActive('/polling-unit-login') ? 'active' : ''}`}
                                >
                                    Polling Unit
                                </Link>
                            </>
                        )}
                        {isAuthenticated && (
                            <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={handleLogout}
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        )}
                    </nav>

                    {/* Mobile Menu Button - Show for all users */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu - Show for all users */}
            {isOpen && (
                <div className="header-mobile-menu">
                    {/* For unauthenticated users */}
                    {!isAuthenticated && (
                        <>
                            <Link
                                to="/"
                                className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                Results
                            </Link>
                            <Link
                                to="/admin-login"
                                className={`mobile-nav-link ${isActive('/admin-login') ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                Admin Login
                            </Link>
                            <Link
                                to="/polling-unit-login"
                                className={`mobile-nav-link ${isActive('/polling-unit-login') ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                Polling Unit Login
                            </Link>
                        </>
                    )}

                    {/* For authenticated users */}
                    {isAuthenticated && (
                        <>
                            <Link
                                to={getDashboardLink()}
                                className={`mobile-nav-link ${isActive(getDashboardLink()) ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <Home size={16} />
                                Dashboard
                            </Link>
                            <button
                                className="mobile-nav-link"
                                onClick={handleLogout}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </>
                    )}
                </div>
            )}
        </header>
    );
};

export default Header;
