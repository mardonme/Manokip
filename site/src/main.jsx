import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './styles.css';

import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Product.jsx';
import Solutions from './pages/Solutions.jsx';
import Service from './pages/Service.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Documents from './pages/Documents.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';

import { LangProvider } from './lib/LangContext.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import { CartProvider } from './lib/CartContext.jsx';
import SignInModal from './components/SignInModal.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <SignInModal />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product" element={<Product />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/solutions" element={<Solutions />} />
              <Route path="/service" element={<Service />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  </React.StrictMode>,
);
