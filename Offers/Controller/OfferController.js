const Offer = require('../Model/Offer');
const asyncHandler = require('express-async-handler');

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private (ShopOwner/Admin)
const createOffer = asyncHandler(async (req, res) => {
    const { 
        title, 
        description, 
        offerLevel, 
        offerType, 
        discountValue, 
        discountType, 
        shopId, 
        validUntil 
    } = req.body;

    // Basic permission check could be added here (e.g., check if user owns shopId)
    
    const offer = await Offer.create({
        title,
        description,
        offerLevel,
        offerType,
        discountValue: offerType === 'discount' ? discountValue : 0,
        discountType: offerType === 'discount' ? discountType : 'flat',
        shopId: offerLevel === 'shop' ? shopId : null,
        validUntil,
        isActive: true
    });

    if (offer) {
        res.status(201).json({
            success: true,
            message: "Offer created successfully",
            data: offer
        });
    } else {
        res.status(400);
        throw new Error('Invalid offer data');
    }
});

// @desc    Get all active platform offers
// @route   GET /api/offers/platform
// @access  Public
const getPlatformOffers = asyncHandler(async (req, res) => {
    const offers = await Offer.find({ 
        offerLevel: 'platform', 
        isActive: true,
        validUntil: { $gte: new Date() }
    });
    res.status(200).json({ success: true, data: offers });
});

// @desc    Get offers for a specific shop
// @route   GET /api/offers/shop/:shopId
// @access  Public
const getShopOffers = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const offers = await Offer.find({ 
        shopId, 
        isActive: true,
        validUntil: { $gte: new Date() }
    });
    res.status(200).json({ success: true, data: offers });
});

// @desc    Toggle offer status
// @route   PATCH /api/offers/:id/toggle
// @access  Private
const toggleOfferStatus = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found');
    }
    offer.isActive = !offer.isActive;
    await offer.save();
    res.status(200).json({ success: true, data: offer });
});

// @desc    Edit an existing offer
// @route   PUT /api/offers/:id
// @access  Private (ShopOwner/Admin)
const editOffer = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found');
    }

    const {
        title,
        description,
        offerLevel,
        offerType,
        discountValue,
        discountType,
        shopId,
        validUntil
    } = req.body;

    offer.title        = title        ?? offer.title;
    offer.description  = description  ?? offer.description;
    offer.offerLevel   = offerLevel   ?? offer.offerLevel;
    offer.offerType    = offerType    ?? offer.offerType;
    offer.discountValue = offerType === 'discount'
        ? (discountValue ?? offer.discountValue)
        : 0;
    offer.discountType  = offerType === 'discount'
        ? (discountType ?? offer.discountType)
        : 'flat';
    offer.shopId       = (offerLevel ?? offer.offerLevel) === 'shop'
        ? (shopId ?? offer.shopId)
        : null;
    offer.validUntil   = validUntil   ?? offer.validUntil;

    const updatedOffer = await offer.save();
    res.status(200).json({
        success: true,
        message: 'Offer updated successfully',
        data: updatedOffer
    });
});

// @desc    Delete an offer
// @route   DELETE /api/offers/:id
// @access  Private (ShopOwner/Admin)
const deleteOffer = asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found');
    }

    await offer.deleteOne();
    res.status(200).json({
        success: true,
        message: 'Offer deleted successfully'
    });
});

module.exports = {
    createOffer,
    getPlatformOffers,
    getShopOffers,
    toggleOfferStatus,
    editOffer,
    deleteOffer
};
