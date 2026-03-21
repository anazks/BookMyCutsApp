const CustomizationModel = require('../Model/CustomizationModel');

module.exports.createCustomization = async (data) => {
    try {
        // Attempt to drop the old shopId index to prevent E11000 duplicate key errors
        try {
            await CustomizationModel.collection.dropIndex('shopId_1');
        } catch (e) {
            // Ignore if index doesn't exist
        }

        // Maintain only one single global civilization document via upsert
        const customization = await CustomizationModel.findOneAndUpdate(
            {}, 
            { $set: data },
            { new: true, upsert: true } // Create if missing, otherwise update the existing single doc
        );
        return customization;
    } catch (error) {
        console.error('Error upserting customization:', error);
        throw error;
    }
};

module.exports.getCustomization = async () => {
    try {
        // Since there is no shopId, we just fetch the first/only document
        const customization = await CustomizationModel.findOne();
        return customization;
    } catch (error) {
        console.error('Error fetching customization:', error);
        throw error;
    }
};
