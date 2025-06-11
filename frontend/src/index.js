import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Polyfills for Web3 compatibility
import { Buffer } from 'buffer';
import { process } from 'process';

// Make Buffer and process available globally for Web3 libraries
window.Buffer = Buffer;
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);