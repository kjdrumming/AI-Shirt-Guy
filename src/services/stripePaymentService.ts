import { formatAmountForStripe } from '@/lib/stripe';

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreatePaymentIntentRequest {
  amount: number; // Amount in dollars
  currency?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: string;
}

class StripePaymentService {
  private baseUrl = 'http://localhost:3001/api/stripe'; // Point to backend server
  
  /**
   * Create a payment intent for the order
   */
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formatAmountForStripe(data.amount), // Convert to cents
          currency: data.currency || 'usd',
          metadata: data.metadata || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const paymentIntent = await response.json();
      
      return {
        success: true,
        paymentIntent,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Confirm payment and get result
   */
  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm payment');
      }

      const result = await response.json();
      
      return {
        success: result.status === 'succeeded',
        paymentIntent: result,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/payment-intent/${paymentIntentId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get payment intent');
      }

      const paymentIntent = await response.json();
      
      return {
        success: true,
        paymentIntent,
      };
    } catch (error) {
      console.error('Error getting payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export singleton instance
export const stripePaymentService = new StripePaymentService();