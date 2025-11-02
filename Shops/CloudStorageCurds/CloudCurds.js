// mediaController.js (Using CommonJS)

const cloudinary = require('cloudinary').v2; 
const Decoder = require("../../TokenDecoder/Decoder");
const ShopModel = require("../Model/ShopModel"); // Adjust path as needed

const uploadMedia = async (req, res) => {
    try {
        // FIX: Access shopId directly from req.params object
        const shopId = req.params.id; // or const { shopId } = req.params;

        console.log("Shop ID:", shopId); // Debug log

        // Validate shopId
        if (!shopId) {
            return res.status(400).json({ message: "Shop ID is required" });
        }

        // Check if file exists (comes from Multer middleware)
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const media = req.file;

        // Determine resource type based on mimetype
        let resourceType = 'auto';
        if (media.mimetype.startsWith('video/')) {
            resourceType = 'video';
        } else if (media.mimetype.startsWith('image/')) {
            resourceType = 'image';
        }

        // Upload to Cloudinary using Promise and upload_stream
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `shop_media/${shopId}`, // Organize files by shop
                    resource_type: resourceType,
                    public_id: `${Date.now()}_${media.originalname.split('.')[0]}`, 
                    unique_filename: true,
                    overwrite: false
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            
            uploadStream.end(media.buffer); 
        });

        // Find and update shop - push only the URL to media array
        const updatedShop = await ShopModel.findByIdAndUpdate(
            shopId,
            {
                $push: {
                    media: uploadResult.secure_url
                }
            },
            { new: true, runValidators: true } // Return updated document
        );

        // Check if shop exists
        if (!updatedShop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Return success response with updated shop document
        return res.status(200).json({
            message: "File uploaded successfully",
            shop: updatedShop
        });

    } catch (error) {
        console.error("Upload Error:", error);
        
        // Handle specific errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File size exceeds limit" });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid Shop ID format" });
        }

        return res.status(500).json({
            message: "Upload failed",
            error: error.message
        });
    }
};

module.exports = { uploadMedia };