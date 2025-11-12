import { useCart } from "../components/CartContext";
import { useNavigate } from "react-router-dom";

function CartPage() {
  const { cart, removeFromCart } = useCart();
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("🛒 Your cart is empty.");
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-black rounded shadow">
      <h1 className="text-2xl font-bold mb-6">🛒 Your Cart</h1>

      {cart.length === 0 ? (
        <p className="text-gray-600">Your cart is empty.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {cart.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center border p-3 rounded"
              >
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p>${item.price}</p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-lg font-semibold"
          >
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
}

export default CartPage;
