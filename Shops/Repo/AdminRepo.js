console.log("ADMINREPO LOADED - Govind test 123");
const express = require('express');
const UserModel = require('../../Auth/Model/UserModel');
const ShoperModel = require('../../Auth/Model/ShoperModel');
const ShopModel = require('../Model/ShopModel');
const BookingModel = require('../../Booking/Models/BookingModel');
const TransactionLog = require('../../Booking/Models/TransactionLogModel');

module.exports.fetchTransactionLogs = async ({ page = 1, limit = 20, stage, status, startDate, endDate, sortBy = 'createdAt', sortOrder = -1 }) => {
    const filter = {};

    if (stage) filter.stage = stage;
    if (status) filter.status = status;

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: Number(sortOrder) };

    const [logs, totalCount] = await Promise.all([
        TransactionLog.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email phone')
            .populate('bookingId', 'bookingDate totalPrice status')
            .lean(),
        TransactionLog.countDocuments(filter)
    ]);

    return {
        logs,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1
        }
    };
};

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