// utils/notificationHelper.js
const Notification = require('../Auth/Model/Notification'); // Make sure you have a Notification model!
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

exports.sendAndSaveNotification = async ({ recipientId, accountType, pushToken, title, body, type, data, categoryId }) => {
  try {
    // 1. Save to Database (Optional, but highly recommended for an in-app inbox)
    const newNotification = await Notification.create({
      recipientId,
      accountType,
      title,
      body,
      type,
      data
    });

    // 2. Send the Push Notification via Expo
    if (pushToken && Expo.isExpoPushToken(pushToken)) {
      let messages = [{
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        categoryId: categoryId // Attaches the interactive buttons!
      }];
      
      await expo.sendPushNotificationsAsync(messages);
    }

    return newNotification;
  } catch (error) {
    console.error('Error in sendAndSaveNotification:', error);
    throw error;
  }
};