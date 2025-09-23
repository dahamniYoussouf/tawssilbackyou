import supabase from "../utils/supabaseClient.js";

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const filePath = `uploads/${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
      .from("my-bucket") 
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("my-bucket")
      .getPublicUrl(filePath);

    res.json({ url: data.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
};
