const { createCustomizationUseCase, getCustomizationUseCase } = require('../UseCauses/customizationUseCase');

const createCustomization = async (req, res) => {
    try {
        const data = req.body;
        const imageFile = req.file || null;

        const customization = await createCustomizationUseCase(data, imageFile);

        res.status(201).json({
            success: true,
            message: 'Customization created successfully',
            customization
        });
    } catch (error) {
        console.error('Create customization error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getCustomization = async (req, res) => {
    try {
        const customization = await getCustomizationUseCase();

        if (!customization) {
            return res.status(404).json({
                success: false,
                message: 'Customization not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Customization fetched successfully',
            customization
        });
    } catch (error) {
        console.error('Get customization error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createCustomization,
    getCustomization
};
