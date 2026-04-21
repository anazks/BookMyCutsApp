const express = require('express');
const router = express.Router();
const { 
    createOffer, 
    getPlatformOffers, 
    getShopOffers, 
    toggleOfferStatus,
    editOffer,
    deleteOffer
} = require('../Controller/OfferController');

router.post('/', createOffer);
router.get('/platform', getPlatformOffers);
router.get('/shop/:shopId', getShopOffers);
router.patch('/:id/toggle', toggleOfferStatus);
router.put('/:id', editOffer);
router.delete('/:id', deleteOffer);


module.exports = router;
