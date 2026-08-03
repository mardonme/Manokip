import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import './styles.css';

import { LangProvider } from './lib/LangContext.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import { CartProvider } from './lib/CartContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import SignInModal from './components/SignInModal.jsx';
import { SITE_URL } from './components/Seo.jsx';

// Site-wide structured data (Organization + WebSite). Emitted once, on every
// page, so search engines can build the brand entity and a sitelinks search box.
const SITE_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Manokip',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.svg`,
      description:
        'Manufacturer of industrial control and measuring instruments: pressure gauges, transducers, level meters and protection relays.',
      telephone: '+998905446107',
      email: 'manokip@manometr.uz',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Tashkent',
        addressCountry: 'UZ',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+998905446107',
        contactType: 'sales',
        areaServed: 'UZ',
        availableLanguage: ['ru', 'uz', 'en'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Manokip',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

function SiteJsonLd() {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(SITE_JSONLD)}</script>
    </Helmet>
  );
}

// Route-level code splitting — each page ships as its own chunk so the initial
// load only pays for the route the visitor actually opened. Admin and the chat
// widget (rarely needed by most visitors) stay out of the main bundle entirely.
const Home = lazy(() => import('./pages/Home.jsx'));
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Documents = lazy(() => import('./pages/Documents.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const InfoPage = lazy(() => import('./pages/InfoPage.jsx'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));
const ChatWidget = lazy(() => import('./components/ChatWidget.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// AI assistant on the storefront, hidden in the admin area.
function ChatWidgetGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}

// Slim top progress bar while a route chunk loads — far less jarring than a
// full-screen spinner, and it reserves no layout space (no CLS).
function RouteFallback() {
  return <div className="mk-routebar" role="progressbar" aria-label="Loading" />;
}

// Re-mounting on pathname change re-runs the .mk-page entrance animation,
// giving every navigation a consistent, subtle fade-up transition.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<RouteFallback />}>
      <div className="mk-page" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product" element={<Navigate to="/catalog" replace />} />
          <Route path="/product/:id" element={<Product />} />
          {/* Solutions and Service pages were removed; both URLs are indexed,
              so redirect to the nearest equivalent instead of 404-ing. */}
          <Route path="/solutions" element={<Navigate to="/catalog" replace />} />
          <Route path="/service" element={<Navigate to="/contact" replace />} />
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
      </div>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <BrowserRouter>
                <SiteJsonLd />
                <a href="#main" className="mk-skip">Skip to content</a>
                <ScrollToTop />
                <SignInModal />
                <AnimatedRoutes />
                <ChatWidgetGate />
              </BrowserRouter>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
