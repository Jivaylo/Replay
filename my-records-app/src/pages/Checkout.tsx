import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../components/CartContext";
import { supabase } from "../supabaseClient";

function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  // shipping info
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  // payment method
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ideal" | "cash">(
    "card"
  );

  // card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // iDEAL fields
  const [idealBank, setIdealBank] = useState("");

  const [loading, setLoading] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setLoading(true);

    // get logged in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to place an order.");
      navigate("/login");
      return;
    }

    // Build payment details object depending on the method
    let paymentDetails: any = {};
    let status = "unpaid";

    if (paymentMethod === "card") {
      // ❗ In real production you NEVER store full card details.
      // We just simulate here.
      paymentDetails = {
        type: "card",
        last4: cardNumber.slice(-4),
        expiry: cardExpiry,
      };
      status = "unpaid"; // we would mark 'paid' after Stripe confirms
    } else if (paymentMethod === "ideal") {
      paymentDetails = {
        type: "ideal",
        bank: idealBank,
      };
      status = "unpaid";
    } else if (paymentMethod === "cash") {
      paymentDetails = {
        type: "cash_on_delivery",
      };
      status = "cash_on_delivery";
    }

    // Build order row
    const orderRow = {
      user_id: user.id,
      items: cart,
      total_amount: total,
      full_name: fullName,
      address,
      city,
      country,
      postal_code: postalCode,
      phone,
      payment_method: paymentMethod,
      payment_status: status,
      payment_details: paymentDetails,
    };

    // Save order to Supabase
    const { error } = await supabase.from("orders").insert(orderRow);

    if (error) {
      console.error("Order insert error:", error.message);
      alert("❌ Failed to place order: " + error.message);
      setLoading(false);
      return;
    }

    // In real Stripe flow:
    // - If paymentMethod === "card" or "ideal"
    //   -> call backend/Edge Function that creates Stripe Checkout Session
    //   -> redirect user to Stripe hosted checkout page.
    //
    // For now we just simulate success:
    if (paymentMethod === "cash") {
      alert("✅ Order placed! Pay cash on delivery.");
    } else if (paymentMethod === "card") {
      alert(
        "💳 Card info submitted. (Next step will be redirect to Stripe Checkout in production.)"
      );
    } else if (paymentMethod === "ideal") {
      alert(
        "🏦 iDEAL bank selected. (Next step will be redirect to iDEAL payment in production.)"
      );
    }

    clearCart();
    navigate("/");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-black rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      {cart.length === 0 ? (
        <p className="text-gray-700">Your cart is empty.</p>
      ) : (
        <>
          {/* Order summary up top */}
          <div className="mb-6 border rounded p-4 bg-gray-50 text-sm">
            <h2 className="font-semibold mb-2">Order Summary</h2>
            <ul className="space-y-1">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between border-b last:border-b-0 pb-1"
                >
                  <span>{item.title}</span>
                  <span>${item.price}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-bold mt-3 text-base">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* SHIPPING INFO */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                1. Shipping Information
              </h2>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="p-2 border rounded w-full mb-2"
                required
              />
              <input
                type="text"
                placeholder="Street / Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="p-2 border rounded w-full mb-2"
                required
              />

              <div className="flex gap-3 mb-2">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="p-2 border rounded w-1/2"
                  required
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="p-2 border rounded w-1/2"
                  required
                />
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="p-2 border rounded w-1/2"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="p-2 border rounded w-1/2"
                  required
                />
              </div>
            </div>

            {/* PAYMENT METHOD */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                2. Payment Method
              </h2>

              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                <span>💳 Credit / Debit Card</span>
              </label>

              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  value="ideal"
                  checked={paymentMethod === "ideal"}
                  onChange={() => setPaymentMethod("ideal")}
                />
                <span>🏦 iDEAL (NL bank transfer)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                <span>💵 Cash on Delivery</span>
              </label>
            </div>

            {/* CONDITIONAL FIELDS FOR CARD */}
            {paymentMethod === "card" && (
              <div className="border rounded p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 text-sm text-gray-700">
                  Card Details
                </h3>
                <input
                  type="text"
                  placeholder="Card Number (16 digits)"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="p-2 border rounded w-full mb-2"
                  required
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="p-2 border rounded w-1/2"
                    required
                  />
                  <input
                    type="text"
                    placeholder="CVC"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="p-2 border rounded w-1/2"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Card will be processed securely. We never show full details to
                  sellers.
                </p>
              </div>
            )}

            {/* CONDITIONAL FIELDS FOR iDEAL */}
            {paymentMethod === "ideal" && (
              <div className="border rounded p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 text-sm text-gray-700">
                  Select your bank
                </h3>
                <select
                  className="p-2 border rounded w-full"
                  value={idealBank}
                  onChange={(e) => setIdealBank(e.target.value)}
                  required
                >
                  <option value="">Choose bank…</option>
                  <option value="ing">ING</option>
                  <option value="rabobank">Rabobank</option>
                  <option value="abn_amro">ABN AMRO</option>
                  <option value="bunq">bunq</option>
                  <option value="sns">SNS</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-2">
                  You’ll be redirected to your bank to approve the payment.
                </p>
              </div>
            )}

            {/* CASH NOTE */}
            {paymentMethod === "cash" && (
              <div className="border rounded p-4 bg-gray-50 text-sm text-gray-700">
                You will pay in cash when the record is delivered. Please have
                exact amount: ${total.toFixed(2)}.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white py-3 rounded hover:bg-green-700 text-lg font-semibold"
            >
              {loading ? "Placing order..." : "Place Order"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default Checkout;
