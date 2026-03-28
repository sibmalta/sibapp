import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Toast from './components/Toast'

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
import AuthPage from './pages/AuthPage'
import AdminPage from './pages/AdminPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import PayoutSettingsPage from './pages/PayoutSettingsPage'
import TermsPage from './pages/TermsPage'
import BuyerProtectionPage from './pages/BuyerProtectionPage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import ProhibitedItemsPage from './pages/ProhibitedItemsPage'
import SettingsPage from './pages/SettingsPage'

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="listing/:id" element={<ListingPage />} />
          <Route path="sell" element={<SellPage />} />
          <Route path="checkout/:id" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="messages" element={<ChatListPage />} />
          <Route path="messages/:id" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:username" element={<ProfilePage />} />
          <Route path="profile/edit" element={<EditProfilePage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="seller" element={<SellerDashboardPage />} />
          <Route path="seller/payout-settings" element={<PayoutSettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="buyer-protection" element={<BuyerProtectionPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="prohibited-items" element={<ProhibitedItemsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toast />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
