const axios = require('axios');
const crypto = require('crypto');

async function testWebhook() {
  const url = 'http://localhost:3002/api/booking/webhook/razorpay';
  const secret = 'BookMyCutsSecureWebhook123';
  const payload = JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_123',
          amount: 50000,
          notes: {
            bookingId: '65f1234567890abcdef12345'
          }
        }
      }
    }
  });

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  console.log('Sending test webhook...');
  console.log('Signature:', signature);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      }
    });
    console.log('Response Status:', response.status);
    console.log('Response Body:', response.data);
  } catch (error) {
    console.error('Error Status:', error.response?.status);
    console.error('Error Body:', error.response?.data);
  }
}

testWebhook();
