import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Messages from "./pages/Messages";
import ChatPage from "./pages/ChatPage";
import Sell from "./pages/Sell";
import AddVinyl from "./pages/AddVinyl";
import CartPage from "./pages/CartPage";
import { supabase } from "./supabaseClient";
import Checkout from "./pages/Checkout";
import { Mail, ShoppingCart } from "lucide-react";
import logo from "./assets/logo.png";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestOnlyRoute from "./components/GuestOnlyRoute";
import { CartProvider, useCart } from "./components/CartContext";

function App() {
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id);
      }
    });

    // 🧩 Listen for login/logout
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          loadProfile(session.user.id);
          subscribeToProfileChanges(session.user.id);
        } else {
          setUsername(null);
          setAvatarUrl(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 🔹 Fetch username + avatar
  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error.message);
      return;
    }

    if (data) {
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
    }
  };

  // 🔹 Subscribe to real-time profile updates
  const subscribeToProfileChanges = (userId: string) => {
    const channel = supabase
      .channel("realtime-profile-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated) {
            setAvatarUrl(updated.avatar_url || null);
            setUsername(updated.username || username);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUsername(null);
    setAvatarUrl(null);
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-gradient-to-b from-forest via-sage to-mint text-white">
        <Router>
          <nav className="flex justify-between items-center p-4 bg-black bg-opacity-40">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Replay Logo" className="h-20 w-auto" />
              <span className="font-bold text-2xl hidden sm:inline">
                Records Marketplace
              </span>
            </Link>

            {session ? (
              <div className="flex space-x-4 items-center">
                <Link
                  to="/messages"
                  className="flex items-center gap-2 px-3 py-1 bg-blue-500 rounded hover:bg-blue-600"
                >
                  <Mail className="w-5 h-5" />
                  <span>Messages</span>
                </Link>

                <Link
                  to="/sell"
                  className="px-3 py-1 bg-green-500 rounded hover:bg-green-600"
                >
                  Sell
                </Link>

                <CartButton />

                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:underline"
                >
                  <span>{username || session.user.email}</span>
                  <img
                    src={
                      avatarUrl ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                    }
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border border-white"
                  />
                </Link>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/login"
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-green-400 text-black rounded-lg hover:bg-green-500"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>

          <div className="p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/login"
                element={
                  <GuestOnlyRoute session={session}>
                    <Login />
                  </GuestOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestOnlyRoute session={session}>
                    <Register />
                  </GuestOnlyRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute session={session}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
                <Route
                path="/profile/:id"
                element={
                <ProtectedRoute session={session}>
                <Profile />
                </ProtectedRoute>
                }
              />
            <Route
               path="/checkout"
              element={
              <ProtectedRoute session={session}>
              <Checkout />
              </ProtectedRoute>
              }
            />

              <Route
                path="/messages"
                element={
                  <ProtectedRoute session={session}>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:id"
                element={
                  <ProtectedRoute session={session}>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sell"
                element={
                  <ProtectedRoute session={session}>
                    <Sell />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sell/new"
                element={
                  <ProtectedRoute session={session}>
                    <AddVinyl />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute session={session}>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </div>
    </CartProvider>
  );
}

function CartButton() {
  const { cart } = useCart();
  return (
    <Link to="/cart" className="relative flex items-center">
      <ShoppingCart className="w-6 h-6" />
      {cart.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2">
          {cart.length}
        </span>
      )}
    </Link>
  );
}

export default App;
