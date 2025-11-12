import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

function Messages() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

 
  useEffect(() => {
    if (!currentUser) return;

    const loadConversations = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) return console.error("Inbox error:", error.message);

      const map = new Map();
      data.forEach((msg) => {
        const otherId =
          msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;

        if (otherId === currentUser.id) return; 

        if (!map.has(otherId)) {
          map.set(otherId, msg);
        }
      });

      const ids = Array.from(map.keys());
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ids);

        const convos = ids.map((id) => {
          const msg = map.get(id);
          const user = profiles?.find((p) => p.id === id);
          return {
            otherId: id,
            username: user?.username || "Unknown",
            lastMessage: msg.content,
            created_at: msg.created_at,
          };
        });

        setConversations(convos);
      } else {
        setConversations([]);
      }
    };

    loadConversations();

    
    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (
            msg.sender_id === currentUser.id ||
            msg.receiver_id === currentUser.id
          ) {
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  
const handleSearch = async () => {
  console.log("🔍 Search button clicked with:", search);

  if (!currentUser || search.trim().length === 0) {
    console.log("⚠️ No currentUser or empty search string");
    setUsers([]);
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${search}%`) 
    .neq("id", currentUser.id)       
    .limit(10);

  
  console.log("➡️ Supabase data:", data);
  console.log("➡️ Supabase error:", error);

  if (error) {
    console.error("❌ Search error:", error.message);
  } else {
    setUsers(data || []);
  }
};


  
  const handleFollow = async (targetId: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from("follows").upsert({
      follower_id: currentUser.id,
      following_id: targetId,
    });
    if (error) alert("❌ " + error.message);
    else alert("✅ Now following!");
  };

  
  const handleUnfollow = async (targetId: string) => {
    if (!currentUser) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUser.id)
      .eq("following_id", targetId);
    if (error) alert("❌ " + error.message);
    else alert("❌ Unfollowed!");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">💬 Messages</h1>

      
      <div className="flex mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded-l w-full text-black"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 px-4 text-white rounded-r"
        >
          Search
        </button>
      </div>

      {users.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold">Search Results</h2>
          {users.map((u) => (
            <div
              key={u.id}
              className="flex justify-between items-center bg-white text-black p-3 rounded"
            >
              <Link to={`/profile/${u.id}`} className="font-semibold">
                {u.username || "Unnamed user"}
              </Link>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFollow(u.id)}
                  className="px-3 py-1 bg-green-500 text-white rounded"
                >
                  Follow
                </button>
                <button
                  onClick={() => handleUnfollow(u.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded"
                >
                  Unfollow
                </button>
                <Link
                  to={`/chat/${u.id}`}
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      
      <h2 className="text-xl font-semibold mb-4">Your Conversations</h2>
      {conversations.length === 0 ? (
        <p className="text-gray-200">No conversations yet.</p>
      ) : (
        <div className="space-y-4">
          {conversations.map((c) => (
            <Link
              key={c.otherId}
              to={`/chat/${c.otherId}`}
              className="block bg-white text-black p-4 rounded shadow hover:bg-gray-100"
            >
              <div className="font-bold">{c.username}</div>
              <div className="text-sm text-gray-600 truncate">
                {c.lastMessage}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Messages;
