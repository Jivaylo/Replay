import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { useCart } from "../components/CartContext";

function Sell() {
  const [vinyls, setVinyls] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortOption, setSortOption] = useState("newest");
  const [othersFirst, setOthersFirst] = useState(true);
  const { addToCart } = useCart();
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Get logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Load vinyls and sort/filter
  useEffect(() => {
    const loadVinyls = async () => {
      const { data, error } = await supabase
        .from("vinyls")
        .select(`
          id,
          user_id,
          title,
          description,
          image_url,
          price,
          ai_grade,
          ai_notes,
          created_at,
          profiles (
            id,
            username,
            avatar_url
          )
        `);

      if (error) {
        console.error("Error loading vinyls:", error.message);
        return;
      }

      let sorted = [...(data || [])];

      if (sortOption === "lowest") sorted.sort((a, b) => a.price - b.price);
      else if (sortOption === "highest") sorted.sort((a, b) => b.price - a.price);
      else if (sortOption === "oldest")
        sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      else
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      if (othersFirst && currentUser) {
        sorted.sort((a, b) => {
          if (a.user_id === currentUser.id && b.user_id !== currentUser.id)
            return 1;
          if (a.user_id !== currentUser.id && b.user_id === currentUser.id)
            return -1;
          return 0;
        });
      }

      setVinyls(sorted);

      // Load following list
      if (currentUser) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUser.id);
        setFollowingIds(follows?.map((f) => f.following_id) || []);
      }
    };

    loadVinyls();
  }, [sortOption, othersFirst, currentUser]);

  // Follow/unfollow sellers
  const handleFollow = async (sellerId: string) => {
    if (!currentUser) return;

    if (followingIds.includes(sellerId)) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", sellerId);
      setFollowingIds(followingIds.filter((id) => id !== sellerId));
    } else {
      const { error } = await supabase.from("follows").upsert({
        follower_id: currentUser.id,
        following_id: sellerId,
      });
      if (!error) setFollowingIds([...followingIds, sellerId]);
    }
  };

  // Delete vinyl listing
  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(
      `🗑️ Are you sure you want to delete "${title}"?\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("vinyls").delete().eq("id", id);

    if (error) {
      alert("❌ Failed to delete: " + error.message);
      return;
    }

    setVinyls(vinyls.filter((v) => v.id !== id));
    alert("✅ Listing deleted successfully!");
  };

  return (
    <div className="relative max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Marketplace</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="p-2 border rounded text-black"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="lowest">Lowest Price</option>
          <option value="highest">Highest Price</option>
        </select>

        {currentUser && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={othersFirst}
              onChange={(e) => setOthersFirst(e.target.checked)}
            />
            <span>Show others first</span>
          </label>
        )}
      </div>

      {/* Vinyl listings */}
      {vinyls.length === 0 ? (
        <p className="text-gray-200">No vinyls listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {vinyls.map((v) => (
            <div
              key={v.id}
              className="bg-white text-black rounded shadow p-3 flex flex-col"
            >
              {/* Image */}
              {v.image_url && (
                <img
                  src={v.image_url}
                  alt={v.title}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}

              {/* Seller info */}
              <div className="flex items-center justify-between mb-2">
                <Link
                  to={`/profile/${v.profiles?.id}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <img
                    src={
                      v.profiles?.avatar_url ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                    }
                    className="w-8 h-8 rounded-full object-cover"
                    alt="seller"
                  />
                  <span className="font-semibold">
                    {v.profiles?.username || "Unknown Seller"}
                  </span>
                </Link>

                {currentUser && currentUser.id !== v.user_id && (
                  <button
                    onClick={() => handleFollow(v.user_id)}
                    className={`px-2 py-1 text-sm rounded ${
                      followingIds.includes(v.user_id)
                        ? "bg-gray-500 text-white"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {followingIds.includes(v.user_id)
                      ? "Following"
                      : "Follow"}
                  </button>
                )}
              </div>

             
              <h3 className="font-bold">{v.title}</h3>
              <p className="text-sm text-gray-700 flex-grow">{v.description}</p>
              <p className="text-green-700 font-semibold">${v.price}</p>

{v.ai_grade && (
  <div className="mt-2">
    <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">
      AI Verified: {v.ai_grade}
    </span>
    <button
      onClick={() => {
        const el = document.getElementById(`ai-report-${v.id}`);
        if (el) el.classList.toggle("hidden");
      }}
      className="ml-2 text-xs text-blue-600 hover:underline"
    >
      View AI Report
    </button>

    <div
      id={`ai-report-${v.id}`}
      className="mt-2 p-2 bg-gray-100 text-gray-800 rounded hidden"
    >
      <p className="text-sm"><strong>Explanation:</strong> {v.ai_summary}</p>
      {v.ai_evidence && v.ai_evidence.length > 0 && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {v.ai_evidence.map((e: any, idx: number) => (
            <div key={idx} className="border p-1">
              <img
                src={e.imageUrl}
                alt={`Evidence ${idx + 1}`}
                className="w-full h-auto object-cover rounded mb-1"
              />
              <p className="text-xs italic">{e.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

              {/* Buttons */}
              <div className="mt-3 flex gap-2">
                {currentUser?.id === v.user_id ? (
                  <button
                    onClick={() => handleDelete(v.id, v.title)}
                    className="flex-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      addToCart({
                        id: v.id,
                        title: v.title,
                        price: v.price,
                        image_url: v.image_url,
                      })
                    }
                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    
      <Link
        to="/sell/new"
        className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-lg hover:bg-green-700"
      >
        +
      </Link>
    </div>
  );
}

export default Sell;
