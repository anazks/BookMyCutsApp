const UserModel = require('../Model/UserModel');
const ShoperModel = require('../Model/ShoperModel');
const Notification = require('../Model/Notification');

/**
 * Fetches users based on the audience requirement.
 * Returns an array of user documents with _id and PushToken.
 */
module.exports.getTargetUsers = async (audience, accountType, specificIds) => {
    try {
        let users = [];

        if (audience === 'ALL') {
            const allUsers = await UserModel.find({ 
                $or: [
                    { PushToken: { $exists: true, $ne: null } },
                    { pushToken: { $exists: true, $ne: null } }
                ]
            })
                .select('_id PushToken pushToken')
                .lean();
            const allShopOwners = await ShoperModel.find({ 
                $or: [
                    { PushToken: { $exists: true, $ne: null } },
                    { pushToken: { $exists: true, $ne: null } }
                ]
            })
                .select('_id PushToken pushToken')
                .lean();
                
            users = [
                ...allUsers.map(u => ({ ...u, accountType: 'User' })),
                ...allShopOwners.map(s => ({ ...s, accountType: 'shopOwner' }))
            ];
        } else if (audience === 'ALL_USERS') {
            const result = await UserModel.find({ 
                $or: [
                    { PushToken: { $exists: true, $ne: null } },
                    { pushToken: { $exists: true, $ne: null } }
                ]
            })
                .select('_id PushToken pushToken')
                .lean();
            users = result.map(u => ({ ...u, accountType: 'User' }));
        } else if (audience === 'ALL_SHOP_OWNERS') {
            const result = await ShoperModel.find({ 
                $or: [
                    { PushToken: { $exists: true, $ne: null } },
                    { pushToken: { $exists: true, $ne: null } }
                ]
            })
                .select('_id PushToken pushToken')
                .lean();
            users = result.map(u => ({ ...u, accountType: 'shopOwner' }));
        } else if (audience === 'SPECIFIC') {
            if (!specificIds || specificIds.length === 0) {
                return [];
            }
            // Ensure IDs are strings and trimmed
            const cleanIds = specificIds.map(id => String(id).trim());
            
            if (accountType === 'User') {
                const result = await UserModel.find({ _id: { $in: cleanIds } })
                    .select('_id PushToken pushToken')
                    .lean();
                users = result.map(u => ({ ...u, accountType: 'User' }));
            } else if (accountType === 'shopOwner') {
                const result = await ShoperModel.find({ _id: { $in: cleanIds } })
                    .select('_id PushToken pushToken')
                    .lean();
                users = result.map(u => ({ ...u, accountType: 'shopOwner' }));
            } else {
                throw new Error("Invalid accountType for specific users");
            }
        } else {
            throw new Error("Invalid audience type");
        }

        return users;
    } catch (error) {
        console.error('Error fetching target users for notification:', error);
        throw error;
    }
};

/**
 * Bulk creates notification documents in the database
 */
module.exports.bulkCreateNotifications = async (notificationsArray) => {
    try {
        // Use insertMany for efficient bulk database writes
        if (!notificationsArray || notificationsArray.length === 0) return [];
        const createdDocs = await Notification.insertMany(notificationsArray);
        return createdDocs;
    } catch (error) {
        console.error('Error in bulk creating notifications:', error);
        throw error;
    }
};
