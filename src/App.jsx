import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import Toast from './components/Toast'
import { useAuth } from './lib/auth-context'


import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import ListingPage from './pages/ListingPage'
import SellPage from './pages/SellPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import ChatListPage from './pages/ChatListPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import ReviewsPage from './pages/ReviewsPage'
import AuthPage from './pages/AuthPage'
import AdminPage from './pages/AdminPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import PayoutSettingsPage from './pages/PayoutSettingsPage'
import TermsPage from './pages/TermsPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import BuyerProtectionPage from './pages/BuyerProtectionPage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import ProhibitedItemsPage from './pages/ProhibitedItemsPage'
import SettingsPage from './pages/SettingsPage'
import FAQPage from './pages/FAQPage'
import ContactPage from './pages/ContactPage'
import OffersPage from './pages/OffersPage'
import NotificationsPage from './pages/NotificationsPage'
import BundlePage from './pages/BundlePage'
import BundleCheckoutPage from './pages/BundleCheckoutPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import HowItWorksPage from './pages/HowItWorksPage'
import AboutPage from './pages/AboutPage'
import SellerPolicyPage from './pages/SellerPolicyPage'
import DeliveryPolicyPage from './pages/DeliveryPolicyPage'
import DisputesRefundsPage from './pages/DisputesRefundsPage'
import CookiePolicyPage from './pages/CookiePolicyPage'
import DeliverySettingsPage from './pages/DeliverySettingsPage'

function RecoveryRedirector() {
  const { recoveryMode, session, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!recoveryMode || !session?.access_token) return
    if (location.pathname === '/reset-password') return
    navigate('/reset-password', { replace: true })
  }, [loading, recoveryMode, session, location.pathname, navigate])

  return null
}

function AppRoutes() {
  return (
    <>
      <RecoveryRedirector />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="listing/:id" element={<ListingPage />} />
          <Route path="item/:id" element={<ListingPage />} />
          <Route path="sell" element={<SellPage />} />
          <Route path="checkout/:id" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="messages" element={<ChatListPage />} />
          <Route path="messages/:id" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:username" element={<ProfilePage />} />
          <Route path="profile/edit" element={<EditProfilePage />} />
          <Route path="reviews/:username" element={<ReviewsPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="seller" element={<SellerDashboardPage />} />
          <Route path="seller/payout-settings" element={<PayoutSettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="buyer-protection" element={<BuyerProtectionPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="prohibited-items" element={<ProhibitedItemsPage />} />
          <Route path="seller-policy" element={<SellerPolicyPage />} />
          <Route path="delivery-policy" element={<DeliveryPolicyPage />} />
          <Route path="disputes-refunds" element={<DisputesRefundsPage />} />
          <Route path="cookies" element={<CookiePolicyPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/delivery" element={<DeliverySettingsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="bundle" element={<BundlePage />} />
          <Route path="bundle/checkout" element={<BundleCheckoutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toast />
    </>
  )
}

export default function App() {
  // Strip trailing slash for BrowserRouter basename (it adds its own)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/'

  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter basename={base}>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  )
}
