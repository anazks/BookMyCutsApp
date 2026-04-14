const cloudinary = require('cloudinary').v2;
const { createCustomization, getCustomization } = require('../Repos/customizationRepo');

/**
 * Upload image buffer to Cloudinary and return the secure URL
 */
const uploadToCloudinary = async (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `customization`,
                resource_type: 'image',
                public_id: `${Date.now()}_${file.originalname.split('.')[0]}`,
                unique_filename: true,
                overwrite: false
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(file.buffer);
    });
};

module.exports.createCustomizationUseCase = async (data, imageFile) => {
    try {
        // If an image file is provided, upload to Cloudinary
        if (imageFile) {
            const uploadResult = await uploadToCloudinary(imageFile);
            data.backgroundImage = uploadResult.secure_url;
        }

        const customization = await createCustomization(data);
        return customization;
    } catch (error) {
        console.error('Error in createCustomizationUseCase:', error);
        throw error;
    }
};

module.exports.getCustomizationUseCase = async (screen) => {
    try {
        const customization = await getCustomization(screen);
        return customization;
    } catch (error) {
        console.error('Error in getCustomizationUseCase:', error);
        throw error;
    }
};
