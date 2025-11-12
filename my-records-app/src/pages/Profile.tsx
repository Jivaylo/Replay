import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useParams, Link } from "react-router-dom";

type SimpleUser = { id: string; username: string | null; avatar_url: string | null };

function Profile() {
  const { id } = useParams<{ id?: string }>();

  const [profile, setProfile] = useState<SimpleUser & { bio?: string | null } | null>(null);
  const [vinyls, setVinyls] = useState<any[]>([]);
  const [followers, setFollowers] = useState<SimpleUser[]>([]);
  const [following, setFollowing] = useState<SimpleUser[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newBio, setNewBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (data.user) {
        const viewingOwn = !id || id === data.user.id;
        setIsOwnProfile(viewingOwn);
        loadProfile(viewingOwn ? data.user.id : (id as string), data.user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProfile = async (targetId: string, currentUserId?: string) => {
    // profile
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .eq("id", targetId)
      .single();
    if (pErr) {
      console.error("loadProfile error:", pErr.message);
      setProfile(null);
      return;
    }
    setProfile(p);
    setNewUsername(p?.username || "");
    setNewBio(p?.bio || "");

    // vinyls
    const { data: v } = await supabase
      .from("vinyls")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false });
    setVinyls(v || []);

    // follows (two-step to avoid REST join 400s)
    await loadFollowData(targetId);

    // am I following this profile?
    if (currentUserId && targetId !== currentUserId) {
      const { data: f } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetId)
        .maybeSingle();
      setIsFollowing(!!f);
    } else {
      setIsFollowing(false);
    }
  };

  const loadFollowData = async (userId: string) => {
    // who follows userId
    const { data: followersRows, error: folErr } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId);
    if (folErr) console.error("followers load error:", folErr.message);

    // who userId is following
    const { data: followingRows, error: wingErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    if (wingErr) console.error("following load error:", wingErr.message);

    const followerIds = (followersRows || []).map((r) => r.follower_id);
    const followingIds = (followingRows || []).map((r) => r.following_id);

    let followersProfiles: SimpleUser[] = [];
    let followingProfiles: SimpleUser[] = [];

    if (followerIds.length > 0) {
      const { data: fp } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", followerIds);
      followersProfiles = fp || [];
    }

    if (followingIds.length > 0) {
      const { data: fp } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", followingIds);
      followingProfiles = fp || [];
    }

    // sort alphabetically for nicer UI
    followersProfiles.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
    followingProfiles.sort((a, b) => (a.username || "").localeCompare(b.username || ""));

    setFollowers(followersProfiles);
    setFollowing(followingProfiles);
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id);
      setIsFollowing(false);
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUser.id,
        following_id: profile.id,
      });
      if (!error) setIsFollowing(true);
    }
    await loadFollowData(profile.id);
  };

  // Upload avatar into a per-user folder to satisfy Storage policies
  const uploadAvatarToStorage = async (): Promise<string | null> => {
    if (!avatarFile || !currentUser) return null;

    const ext = avatarFile.name.split(".").pop();
    const path = `${currentUser.id}/avatar.${ext}`; // folder = userId

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      console.error("avatar upload error:", uploadError.message);
      alert("❌ Upload failed: " + uploadError.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);

    let avatarUrl = profile?.avatar_url || null;

    if (avatarFile) {
      const uploadedUrl = await uploadAvatarToStorage();
      if (uploadedUrl) avatarUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername, bio: newBio, avatar_url: avatarUrl })
      .eq("id", currentUser.id);

    if (error) {
      alert("❌ " + error.message);
      setSaving(false);
      return;
    }

    // Optional password update
    if (newPassword.trim() !== "") {
      const { error: passError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (passError) {
        alert("❌ Failed to update password: " + passError.message);
      } else {
        setNewPassword("");
      }
    }

    alert("✅ Profile updated!");
    setEditMode(false);
    setSaving(false);
    await loadProfile(currentUser.id, currentUser.id);
  };

  if (!profile) return <p className="p-6">Loading profile...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Profile header */}
      <div className="flex items-center gap-6 mb-6">
        <img
          src={
            profile.avatar_url ||
            "https://cdn-icons-png.flaticon.com/512/149/149071.png"
          }
          alt="avatar"
          className="w-24 h-24 rounded-full object-cover border-4 border-white"
        />
        <div>
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <p className="text-gray-200">{profile.bio || "No bio yet."}</p>

          <div className="flex gap-6 mt-2 text-sm">
            <button className="hover:underline" onClick={() => setShowFollowers(true)}>
              {followers.length} Followers
            </button>
            <button className="hover:underline" onClick={() => setShowFollowing(true)}>
              {following.length} Following
            </button>
          </div>

          {!isOwnProfile && currentUser?.id !== profile.id && (
            <button
              onClick={handleFollowToggle}
              className={`mt-3 px-4 py-1 rounded ${
                isFollowing
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>
      </div>

      {/* Edit profile section */}
      {isOwnProfile && (
        <>
          {editMode ? (
            <div className="bg-white text-black rounded p-4 mb-6">
              <h2 className="font-bold mb-3">Edit Profile</h2>

              <label className="block mb-2 font-semibold">Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}
                className="mb-3"
              />

              <label className="block mb-1 font-semibold">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full p-2 mb-3 border rounded"
              />

              <label className="block mb-1 font-semibold">Bio</label>
              <textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Write your bio..."
                className="w-full p-2 mb-3 border rounded"
              />

              <label className="block mb-1 font-semibold">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full p-2 mb-4 border rounded"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-1 rounded disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="bg-gray-500 text-white px-4 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="mb-6 bg-blue-500 px-4 py-1 rounded hover:bg-blue-600"
            >
              Edit Profile
            </button>
          )}
        </>
      )}

      {/* Vinyls */}
      <h2 className="text-xl font-bold mb-4">🎶 Vinyls by {profile.username}</h2>
      {vinyls.length === 0 ? (
        <p className="text-gray-300">No vinyls listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {vinyls.map((v) => (
            <div key={v.id} className="bg-white text-black rounded p-3 shadow flex flex-col">
              {v.image_url && (
                <img
                  src={v.image_url}
                  alt={v.title}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}
              <h3 className="font-bold">{v.title}</h3>
              <p className="text-sm text-gray-700 flex-grow">{v.description}</p>
              <p className="text-green-700 font-semibold">${v.price}</p>
            </div>
          ))}
        </div>
      )}

      {/* Followers Modal */}
      {showFollowers && (
        <Modal title="Followers" onClose={() => setShowFollowers(false)}>
          {followers.length === 0 ? (
            <p className="text-gray-600 text-center">No followers yet.</p>
          ) : (
            followers.map((u) => (
              <Link
                key={u.id}
                to={`/profile/${u.id}`}
                onClick={() => setShowFollowers(false)}
                className="flex items-center gap-3 py-2 border-b border-gray-300 hover:bg-gray-100 p-2 rounded"
              >
                <img
                  src={u.avatar_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-black font-medium">{u.username}</span>
              </Link>
            ))
          )}
        </Modal>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <Modal title="Following" onClose={() => setShowFollowing(false)}>
          {following.length === 0 ? (
            <p className="text-gray-600 text-center">Not following anyone yet.</p>
          ) : (
            following.map((u) => (
              <Link
                key={u.id}
                to={`/profile/${u.id}`}
                onClick={() => setShowFollowing(false)}
                className="flex items-center gap-3 py-2 border-b border-gray-300 hover:bg-gray-100 p-2 rounded"
              >
                <img
                  src={u.avatar_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-black font-medium">{u.username}</span>
              </Link>
            ))
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white text-black p-6 rounded-lg w-80 max-h-[80vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-red-600 font-bold text-xl">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Profile;
