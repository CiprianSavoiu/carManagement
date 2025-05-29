import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18+
import CarManagerApp from './car_manager_app.tsx'; // Adjust path if your file name is different

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CarManagerApp />
  </React.StrictMode>
);
