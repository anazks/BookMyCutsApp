// mediaController.js (Using CommonJS)

const cloudinary = require('cloudinary').v2; 
const Decoder = require("../../TokenDecoder/Decoder");
const ShopModel = require("../Model/ShopModel"); // Adjust path as needed

const uploadMedia = async (req, res) => {
    try {
        // 1. Extract shopId from params
        const shopId = req.params.id;
        
        // 2. Extract title and description from request body
        const { title, description } = req.body; 

        console.log("Shop ID:", shopId); // Debug log

        // Validate shopId
        if (!shopId) {
            return res.status(400).json({ message: "Shop ID is required" });
        }
        
        // VALIDATION: Ensure title is provided, as it's required by the subschema
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            // NOTE: Add validation for description here if it were required
            return res.status(400).json({ message: "Media title is required in the request body." });
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

        // Upload to Cloudinary using Promise and upload_stream (NO CHANGE HERE)
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `shop_media/${shopId}`, 
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

        // 3. Construct the media object to be saved
        const newMediaObject = {
            url: uploadResult.secure_url,
            title: title,
            description: description || '' // Use the description or an empty string if not provided
        };

        // 4. Find and update shop - push the ENTIRE OBJECT to the media array
        const updatedShop = await ShopModel.findByIdAndUpdate(
            shopId,
            {
                $push: {
                    media: newMediaObject // Pushing the object now
                }
            },
            { 
                new: true, 
                runValidators: true // IMPORTANT: runs validators on the new embedded object
            } 
        );

        // Check if shop exists (NO CHANGE HERE)
        if (!updatedShop) {
            // Also recommended: Delete the file from Cloudinary if the shop is not found
            // await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: resourceType });
            return res.status(404).json({ message: "Shop not found" });
        }

        // Return success response with updated shop document (NO CHANGE HERE)
        return res.status(200).json({
            message: "File uploaded successfully and metadata saved.",
            media: newMediaObject,
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