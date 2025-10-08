// Controller layer for file uploads
// Handles HTTP requests/responses and delegates logic to the service.

import { uploadFileToSupabase } from "../services/fileUpload.service.js";

/**
 * Handle file upload request
 */
export const uploadFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Call the service to upload the file
    const result = await uploadFileToSupabase(file);

    res.status(200).json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      error: "Upload failed",
    });
  }
};
