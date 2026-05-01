import React, { useState } from 'react';
import Header from '../components/Common/Header';
import Footer from '../components/Common/Footer';
import { BarChart3, Airplay, MapPin, CheckCircle, TrendingUp, Shield } from 'lucide-react';
import WardForm from '../components/Admin/WardForm';
import PollingUnitForm from '../components/Admin/PollingUnitForm';
import PartyForm from '../components/Admin/PartyForm';
import ElectionForm from '../components/Admin/ElectionForm';
import ResultsCenter from '../components/Admin/ResultsCenter';
import Analytics from '../components/Admin/Analytics';
import '../styles/pages/AdminDashboard.css';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('elections');

    const tabs = [
        { id: 'elections', label: 'Elections', icon: BarChart3 },
        { id: 'parties', label: 'Parties', icon: Airplay },
        { id: 'wards', label: 'Wards', icon: MapPin },
        { id: 'polling-units', label: 'Polling Units', icon: CheckCircle },
        { id: 'results', label: 'Results', icon: TrendingUp },
        { id: 'analytics', label: 'Analytics', icon: Shield },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'elections':
                return <ElectionForm />;
            case 'parties':
                return <PartyForm />;
            case 'wards':
                return <WardForm />;
            case 'polling-units':
                return <PollingUnitForm />;
            case 'results':
                return <ResultsCenter />;
            case 'analytics':
                return <Analytics />;
            default:
                return <ElectionForm />;
        }
    };

    return (
        <div className="admin-dashboard-wrapper">
            <Header />

            <main className="admin-dashboard">
                <div className="dashboard-tabs">
                    {/* Top Navigation Bar */}
                    <div className="tabs-nav-top">
                        {tabs.map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`tab-btn-top ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    title={tab.label}
                                >
                                    <IconComponent size={20} />
                                    <span className="tab-label">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area - Full Width */}
                    <div className="tabs-content-full">
                        {renderTabContent()}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
