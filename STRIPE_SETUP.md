# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for your t-shirt maker app.

## 1. Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Start now" to create an account
3. Complete the signup process
4. Verify your email address

## 2. Get Your API Keys

1. Log into your Stripe Dashboard
2. Go to **Developers** → **API keys**
3. You'll see two types of keys:
   - **Publishable key** (starts with `pk_test_...`) - Safe to use in frontend
   - **Secret key** (starts with `sk_test_...`) - Keep this secure, server-side only

## 3. Configure Environment Variables

Update your `.env` file in the project root:

```bash
# Stripe API Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
```

**Important**: Replace the placeholder values with your actual Stripe keys!

## 4. Test Cards for Development

Stripe provides test card numbers for development:

| Card Number | Brand | Description |
|-------------|-------|-------------|
| `4242424242424242` | Visa | Basic successful payment |
| `4000000000000002` | Visa | Card declined |
| `4000000000009995` | Visa | Insufficient funds |
| `5555555555554444` | Mastercard | Successful payment |

**Test Details for Any Card:**
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3-digit number (e.g., 123)
- **ZIP**: Any valid ZIP code (e.g., 12345)

## 5. Start the Server

```bash
# Start the backend server (for Stripe API)
cd server
npm start

# In another terminal, start the frontend
cd ..
npm run dev
```

## 6. Test the Payment Flow

1. Create a design in your app
2. Select size and color
3. Click "Pay & Order Now"
4. Use test card number `4242424242424242`
5. Complete the payment form
6. Verify successful payment

## 7. Monitor Payments

- View test payments in your [Stripe Dashboard](https://dashboard.stripe.com/test/payments)
- Check logs in your terminal for payment events
- All test payments will show up in "Test mode"

## 8. Going Live (When Ready)

1. Complete Stripe account verification
2. Switch to live API keys (they start with `pk_live_...` and `sk_live_...`)
3. Update your environment variables
4. Test with real card (small amount first!)

## Troubleshooting

### "Stripe not configured" Error
- Check that both API keys are set in `.env`
- Restart your server after adding environment variables
- Verify the keys don't have extra spaces or quotes

### Payment Form Not Loading
- Check browser console for errors
- Ensure the publishable key is correct
- Verify the server is running on port 3001

### Server Errors
- Check server terminal for error messages
- Ensure all required packages are installed (`npm install`)
- Verify your secret key is valid

## Security Notes

- **Never** commit real API keys to version control
- **Never** use secret keys in frontend code
- Keep test and live keys separate
- Use environment variables for all sensitive data

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [API Reference](https://stripe.com/docs/api)

## Current Integration Features

✅ **Secure Payment Processing**
✅ **Test & Live Mode Support**  
✅ **Multiple Payment Methods** (Cards, Apple Pay, Google Pay)
✅ **Real-time Payment Status**
✅ **Error Handling & Validation**
✅ **Integration with Printify Orders**

The payment flow now works as:
1. **Create Product** → Printify product creation
2. **Secure Payment** → Stripe payment processing  
3. **Order Fulfillment** → Printify order placement after successful payment