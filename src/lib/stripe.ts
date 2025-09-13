import { loadStripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment variables
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Stripe publishable key not found in environment variables');
}

// Initialize Stripe
export const stripePromise = loadStripe(stripePublishableKey || '');

// Stripe configuration
export const stripeConfig = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#6366f1', // Indigo color to match your app theme
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '6px',
    },
  },
  loader: 'auto' as const,
};

// Payment intent options
export const paymentElementOptions = {
  layout: 'tabs' as const,
  paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
};

// Helper function to format currency for Stripe (amounts in cents)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

// Helper function to format currency for display
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
};