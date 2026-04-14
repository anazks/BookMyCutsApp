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
        const todayBookings = await BookingModel.find({
        createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
        });

        // Calculate today's transaction amount
        const todaysTransactionAmount = todayBookings.reduce((sum, booking) => sum + (Number(booking.amountPaid) || 0), 0);
        const todaysTotalSalesValue = todayBookings.reduce((sum, booking) => sum + (Number(booking.totalPrice) || 0), 0);
        const todaysPlatformFees = todayBookings.reduce((sum, booking) => sum + (Number(booking.platformFee) || 0), 0);

        return {
            usersCount,
            shopOwnersCount,
            shopsCount,
            todayBookingsCount: todayBookings.length, 
            todayBookings,
            todaysTransactionAmount,     // Actual money collected today (online + advance)
            todaysTotalSalesValue,       // Total worth of the services
            todaysPlatformFees           // Total platform fees generated
        }
    } catch (error) {
        console.log(error)
    }
}