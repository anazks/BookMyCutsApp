const CustomizationModel = require('../Model/CustomizationModel');

module.exports.createCustomization = async (data) => {
    try {
        const customization = await CustomizationModel.create(data);
        return customization;
    } catch (error) {
        console.error('Error creating customization:', error);
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
