import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function AddVinyl() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("❌ You must be logged in to upload.");
      return;
    }

    // 1️⃣ Insert the vinyl record into DB
    const { data: vinylData, error: vinylError } = await supabase
      .from("vinyls")
      .insert([
        {
          user_id: user.id,
          title,
          description,
          price: parseFloat(price),
        },
      ])
      .select()
      .single();

    if (vinylError || !vinylData) {
      alert("❌ Failed to save record details: " + vinylError?.message);
      setUploading(false);
      return;
    }

    const vinylId = vinylData.id;
    const uploadedFiles: string[] = [];

    // 2️⃣ Upload files (images/videos)
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const path = `${user.id}/${vinylId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("grading-uploads")
          .upload(path, file, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: publicData } = supabase.storage
            .from("grading-uploads")
            .getPublicUrl(path);
          uploadedFiles.push(publicData.publicUrl);
        }
      }
    }

    // 3️⃣ Update vinyl with first image for preview
    if (uploadedFiles.length > 0) {
      await supabase
        .from("vinyls")
        .update({ image_url: uploadedFiles[0] })
        .eq("id", vinylId);
    }

    // 4️⃣ Call the AI grading Edge Function
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-grade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            vinylId,
            imageUrls: uploadedFiles,
            description,
          }),
        }
      );

      const result = await response.json();
      console.log("AI Grade Result:", result);

      if (result.success) {
        alert(`✅ Record graded: ${result.grade} (${result.summary})`);
      } else {
        console.warn("AI grading failed:", result.error);
      }
    } catch (err) {
      console.error("AI grading request failed:", err);
    }

    setUploading(false);
    navigate("/sell");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-black rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Add New Vinyl</h1>
      <form onSubmit={handleUpload} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={(e) => setFiles(e.target.files)}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          disabled={uploading}
          className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {uploading ? "Uploading & Grading..." : "Upload & Grade Record"}
        </button>
      </form>
    </div>
  );
}

export default AddVinyl;
