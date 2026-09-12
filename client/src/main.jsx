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
import Legal from './pages/Legal.jsx'
import CompareCardLadder from './pages/CompareCardLadder.jsx'
import Compare130point from './pages/Compare130point.jsx'
import ComparePriceCharting from './pages/ComparePriceCharting.jsx'
import AddItem from './pages/AddItem.jsx'
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
        <Route path="/legal" element={<Legal />} />
        <Route path="/compare/card-ladder" element={<CompareCardLadder />} />
        <Route path="/compare/130point" element={<Compare130point />} />
        <Route path="/compare/pricecharting" element={<ComparePriceCharting />} />
        <Route path="/add-item" element={<AddItem />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
