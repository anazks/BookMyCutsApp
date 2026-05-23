const cloudinary = require('cloudinary').v2;
const { saveProfileUrlToDB } = require('../Repo/ShopRepo')

const SaveProfileToCloud = async (media, shopId) => {
  try {
    if (!media) throw new Error("No media file provided");

    // Detect file type
    let resourceType = 'auto';
    if (media.mimetype.startsWith('video/')) resourceType = 'video';
    else if (media.mimetype.startsWith('image/')) resourceType = 'image';

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `profile_media/${shopId}`,
          resource_type: resourceType,
          public_id: `${Date.now()}_${media.originalname.split('.')[0]}`,
          unique_filename: true,
          overwrite: false
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(media.buffer);
    });

    // Extract URL
    const url = uploadResult.secure_url;

    // Save URL to database
    const updatedShop = await saveProfileUrlToDB(shopId, url);

    return {
      success: true,
      message: "Profile image uploaded and saved successfully",
      url,
      shop: updatedShop
    };

  } catch (error) {
    console.error("Error uploading profile media:", error);
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = SaveProfileToCloud;
