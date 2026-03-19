const { Expo } = require('expo-server-sdk');
const { getTargetUsers, bulkCreateNotifications } = require('../Repos/notificationRepo');
let expo = new Expo();

module.exports.sendCustomNotificationUseCase = async (payload) => {
    try {
        const { audience, accountType, specificIds, title, body, type = 'ADMIN_MESSAGE', data = {} } = payload;

        // 1. Get recipients from DB
        const users = await getTargetUsers(audience, accountType, specificIds);

        if (!users || users.length === 0) {
            return {
                success: true,
                message: "No users found or targeted to send notifications to.",
                sentCount: 0
            };
        }

        const dbNotificationPayloads = [];
        const expoMessages = [];

        // 2. Prepare data arrays
        for (const user of users) {
            // Document to be inserted into MongoDB Notification Collection
            dbNotificationPayloads.push({
                recipientId: user._id,
                accountType: user.accountType,
                title,
                body,
                type,
                data
            });

            // Expo Push Notification Object
            if (user.PushToken && Expo.isExpoPushToken(user.PushToken)) {
                expoMessages.push({
                    to: user.PushToken,
                    sound: 'default',
                    title,
                    body,
                    data
                });
            }
        }

        // 3. Save to Database in Bulk
        if (dbNotificationPayloads.length > 0) {
            await bulkCreateNotifications(dbNotificationPayloads);
        }

        // 4. Send the Push Notifications via Expo directly using Expo chunking
        let sentCount = 0;
        let errors = [];
        if (expoMessages.length > 0) {
            let chunks = expo.chunkPushNotifications(expoMessages);
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    sentCount += ticketChunk.length;
                    // Note: In a production app you may want to evaluate ticket receipts for errors like DeviceNotRegistered
                } catch (error) {
                    console.error("Error sending expo chunk:", error);
                    errors.push(error.message);
                }
            }
        }

        return {
            success: true,
            message: `Successfully created ${dbNotificationPayloads.length} DB records and sent ${sentCount} push notifications.`,
            sentCount,
            dbCreatedCount: dbNotificationPayloads.length,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        console.error("Error in sendCustomNotificationUseCase:", error);
        throw error;
    }
};
