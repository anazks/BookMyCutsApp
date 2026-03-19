const { sendCustomNotificationUseCase } = require('../UseCauses/notificationUseCase');

const sendCustomNotification = async (req, res) => {
    try {
        const { audience, accountType, specificIds, title, body, type, data } = req.body;

        // Validation
        if (!audience) {
            return res.status(400).json({ success: false, message: "audience is required." });
        }
        if (!title || !body) {
            return res.status(400).json({ success: false, message: "title and body are required." });
        }
        
        if (audience === 'SPECIFIC') {
            if (!accountType) {
                return res.status(400).json({ success: false, message: "accountType (User / shopOwner) is required when audience is SPECIFIC." });
            }
            if (!specificIds || !Array.isArray(specificIds) || specificIds.length === 0) {
                return res.status(400).json({ success: false, message: "specificIds array is required and cannot be empty when audience is SPECIFIC." });
            }
        }

        // UseCase
        const result = await sendCustomNotificationUseCase({
            audience,
            accountType,
            specificIds,
            title,
            body,
            type,
            data
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Send Custom Notification Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    sendCustomNotification
};
