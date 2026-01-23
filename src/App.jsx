import React, { useState } from 'react';
import SOPWorkbench from './SOPWorkbench';
import MultiDocWorkbench from './MultiDocWorkbench';
import './style.css';

export default function App() {
  const [activeWorkbench, setActiveWorkbench] = useState('multi'); // 'multi' | 'sop' - 默认进入应用端多文档处理工作台

  // Function to switch workbench
  const handleSwitch = () => {
    setActiveWorkbench(prev => prev === 'sop' ? 'multi' : 'sop');
  };

  return (
    <div className="app-shell">
      {activeWorkbench === 'sop' ? (
        <React.Fragment>
          {/* Injecting a switch button or wrapper for SOP Workbench */}
          <div className="sop-wrapper">
            <SOPWorkbench onSwitch={handleSwitch} />
          </div>
        </React.Fragment>
      ) : (
        <MultiDocWorkbench onSwitch={handleSwitch} />
      )}
    </div>
  );
}
