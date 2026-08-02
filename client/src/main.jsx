import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Success from './pages/Success.jsx'
import Unsubscribe from './pages/Unsubscribe.jsx'
import Preferences from './pages/Preferences.jsx'
import Admin from './pages/Admin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/subscribe" element={<Onboarding />} />
        <Route path="/success" element={<Success />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
