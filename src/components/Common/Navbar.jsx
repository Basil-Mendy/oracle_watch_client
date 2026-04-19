/**
 * Navigation Bar Component
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components.css';

const Navbar = ({ title = 'Oracle-Watch' }) => {
    const navigate = useNavigate();
    const { user, logout, userType } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Determine user display name based on user type
    const getUserDisplay = () => {
        if (userType === 'polling-unit' && user?.unit_id) {
            return `Unit: ${user.unit_id}`;
        }
        return user?.email || 'User';
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo">
                    <span className="logo-icon"><BarChart3 size={24} /></span>
                    {title}
                </div>

                {user && (
                    <div className="navbar-menu">
                        <span className="user-info">
                            Welcome, {getUserDisplay()}
                            {user.is_central_admin && <span className="admin-badge">Admin</span>}
                            {userType === 'polling-unit' && <span className="admin-badge" style={{ marginLeft: '8px', backgroundColor: '#7c3aed' }}>Polling Unit</span>}
                        </span>
                        <button className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
