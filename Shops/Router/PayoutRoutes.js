const express = require('express');
const router = express.Router();
const {upsertPayoutAccount} = require('../Controller/PayoutController')


router.route('/accounts').post(upsertPayoutAccount)

module.exports = router
