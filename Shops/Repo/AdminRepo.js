console.log("ADMINREPO LOADED - Govind test 123");
const express = require('express');
const UserModel = require('../../Auth/Model/UserModel');
const ShoperModel = require('../../Auth/Model/ShoperModel');
const ShopModel = require('../Model/ShopModel');
const BookingModel = require('../../Booking/Models/BookingModel');

module.exports.fetchDashboardStats = async () => {
    try {
        const usersCount = await UserModel.countDocuments({});
        const shopOwnersCount = await ShoperModel.countDocuments({});
        const shopsCount = await ShopModel.countDocuments({});
        const todayStats = await BookingModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        $lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalTransactionAmount: { $sum: { $convert: { input: "$amountPaid", to: "double", onError: 0, onNull: 0 } } },
                    totalSalesValue: { $sum: { $convert: { input: "$totalPrice", to: "double", onError: 0, onNull: 0 } } },
                    totalPlatformFees: { $sum: { $convert: { input: "$platformFee", to: "double", onError: 0, onNull: 0 } } }
                }
            }
        ]);

        const today = todayStats[0] || { count: 0, totalTransactionAmount: 0, totalSalesValue: 0, totalPlatformFees: 0 };

        return {
            usersCount,
            shopOwnersCount,
            shopsCount,
            todayBookingsCount: today.count, 
            todaysTransactionAmount: today.totalTransactionAmount,     // Actual money collected today (online + advance)
            todaysTotalSalesValue: today.totalSalesValue,               // Total worth of the services
            todaysPlatformFees: today.totalPlatformFees                 // Total platform fees generated
        }
    } catch (error) {
        console.log(error)
    }
}