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
import Search from './pages/Search.jsx';
import NotFound from './pages/NotFound.jsx';
import InfoPage from './pages/InfoPage.jsx';
import AdminApp from './pages/admin/AdminApp.jsx';

import { LangProvider } from './lib/LangContext.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import { CartProvider } from './lib/CartContext.jsx';
import SignInModal from './components/SignInModal.jsx';
import ChatWidget from './components/ChatWidget.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// AI assistant on the storefront, hidden in the admin area.
function ChatWidgetGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  return <ChatWidget />;
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
              <Route path="/search" element={<Search />} />
              <Route path="/manufacturing" element={<InfoPage page="manufacturing" />} />
              <Route path="/careers" element={<InfoPage page="careers" />} />
              <Route path="/press" element={<InfoPage page="press" />} />
              <Route path="/partners" element={<InfoPage page="partners" />} />
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatWidgetGate />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  </React.StrictMode>,
);
