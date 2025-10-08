// Service layer for file uploads
// Handles all interactions with Supabase storage.

import supabase from "../utils/supabaseClient.js";

/**
 * Upload a file to Supabase storage
 * @param {Object} file - The file object from Multer middleware
 * @returns {Object} - Returns the public URL of the uploaded file
 * @throws {Error} - Throws error if upload fails
 */
export const uploadFileToSupabase = async (file) => {
  // Generate a unique file path using timestamp + original file name
  const filePath = `uploads/${Date.now()}-${file.originalname}`;

  // Upload file to the specified Supabase bucket
  const { error } = await supabase.storage
    .from("my-bucket")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) throw error;

  // Retrieve the public URL for the uploaded file
  const { data } = supabase.storage
    .from("my-bucket")
    .getPublicUrl(filePath);

  return { url: data.publicUrl };
};
