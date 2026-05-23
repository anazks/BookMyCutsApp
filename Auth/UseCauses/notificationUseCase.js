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

        console.log(`Targeted ${users.length} users for audience: ${audience}`);

        const dbNotificationPayloads = [];
        const expoMessages = [];
        let tokensFound = 0;

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

            // Try both Capitalized and lowercase field names
            const token = user.PushToken || user.pushToken;

            // Expo Push Notification Object
            if (token) {
                if (Expo.isExpoPushToken(token)) {
                    tokensFound++;
                    expoMessages.push({
                        to: token,
                        sound: 'default',
                        title,
                        body,
                        data
                    });
                } else {
                    console.warn(`Invalid Expo Push Token for user ${user._id}: ${token}`);
                }
            } else {
                console.warn(`No PushToken or pushToken found for user ${user._id}`);
            }
        }

        console.log(`Prepared ${expoMessages.length} expo messages out of ${users.length} targeted users. (Tokens found but valid: ${tokensFound})`);

        // 3. Save to Database in Bulk
        if (dbNotificationPayloads.length > 0) {
            await bulkCreateNotifications(dbNotificationPayloads);
            console.log(`Created ${dbNotificationPayloads.length} notification records in DB.`);
        }

        // 4. Send the Push Notifications via Expo directly using Expo chunking
        let sentCount = 0;
        let errors = [];
        if (expoMessages.length > 0) {
            let chunks = expo.chunkPushNotifications(expoMessages);
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log(`Sent chunk of ${chunk.length} notifications. Received ${ticketChunk.length} tickets.`);
                    
                    // Count how many were actually 'ok'
                    for (let ticket of ticketChunk) {
                        if (ticket.status === 'ok') {
                            sentCount++;
                        } else {
                            console.error(`Expo notification error: ${ticket.message}`, ticket.details);
                            errors.push(ticket.message);
                        }
                    }
                } catch (error) {
                    console.error("Error sending expo chunk:", error);
                    errors.push(error.message);
                }
            }
        }

        return {
            success: true,
            message: `Processed ${users.length} users. DB: ${dbNotificationPayloads.length}, Sent: ${sentCount}, Tokens Skip/Invalid: ${users.length - sentCount}`,
            sentCount,
            dbCreatedCount: dbNotificationPayloads.length,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        console.error("Error in sendCustomNotificationUseCase:", error);
        throw error;
    }
};
