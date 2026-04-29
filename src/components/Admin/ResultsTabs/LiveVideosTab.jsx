/**
 * Live Videos Tab - DEPRECATED
 * This component is now a wrapper for AdminVideoManagement
 * Use AdminVideoManagement directly for new implementations
 */
import React from 'react';
import AdminVideoManagement from './AdminVideoManagement';

const LiveVideosTab = ({ electionId }) => {
  return <AdminVideoManagement electionId={electionId} />;
};

export default LiveVideosTab;

