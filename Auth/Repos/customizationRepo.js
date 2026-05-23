const CustomizationModel = require('../Model/CustomizationModel');

module.exports.createCustomization = async (data) => {
    try {
        const screen = data.screen || 'home';

        // Maintain one document per screen type via upsert
        const customization = await CustomizationModel.findOneAndUpdate(
            { screen: screen }, 
            { $set: data },
            { new: true, upsert: true } 
        );
        return customization;
    } catch (error) {
        console.error('Error upserting customization:', error);
        throw error;
    }
};

module.exports.getCustomization = async (screen = 'home') => {
    try {
        // 1. Try to find the document specifically for this screen
        let customization = await CustomizationModel.findOne({ screen: screen });

        // 2. SELF-HEALING FALLBACK: If we are looking for 'home' and didn't find it,
        // it might be an old document without the 'screen' field.
        if (!customization && screen === 'home') {
            customization = await CustomizationModel.findOne(); // Fetch any existing one
            if (customization) {
                // Update it so it won't be "lost" again
                customization.screen = 'home';
                await customization.save();
                console.log('✅ Migrated legacy customization to "home" screen');
            }
        }

        return customization;
    } catch (error) {
        console.error('Error fetching customization:', error);
        throw error;
    }
};
