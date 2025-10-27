import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import AuthProvider from "./auth/AuthProvider.jsx";
import Protected from "./components/Protected.jsx";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";

import { Glass } from "./components/ui/Glass";

// admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminGamesPage from "./pages/admin/AdminGamesPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminDirectoryPage from "./pages/admin/AdminDirectoryPage";

function Shell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Header />}

      <main className={isAdmin ? "min-h-screen" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        <Routes>
          {/* публичные маршруты */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/success/:id" element={<OrderSuccessPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* профиль — требует авторизации */}
          <Route
            path="/profile"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />

          {/* админ-панель — только для admin */}
          <Route element={<Protected roles={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="games" element={<AdminGamesPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="taxonomies" element={<AdminDirectoryPage />} />
            </Route>
          </Route>

          {/* fallback для несуществующих страниц */}
          <Route path="*" element={<Glass className="m-6 p-6">Страница не найдена</Glass>} />
        </Routes>
      </main>

      {!isAdmin && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}