const express = require('express');
const router = express.Router();
const { 
    createOffer, 
    getPlatformOffers, 
    getShopOffers, 
    toggleOfferStatus 
} = require('../Controller/OfferController');

router.post('/', createOffer);
router.get('/platform', getPlatformOffers);
router.get('/shop/:shopId', getShopOffers);
router.patch('/:id/toggle', toggleOfferStatus);

module.exports = router;
