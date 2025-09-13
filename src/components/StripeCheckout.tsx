import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { stripePromise, stripeConfig, paymentElementOptions } from '@/lib/stripe';
import { stripePaymentService, type PaymentIntent } from '@/services/stripePaymentService';

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

// The actual payment form component
function CheckoutForm({ clientSecret, amount, onPaymentSuccess, onPaymentError, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred during payment');
        onPaymentError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onPaymentError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement options={paymentElementOptions} />
      </div>

      {errorMessage && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by Stripe • Your payment information is encrypted
        </p>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  amount: number;
  productTitle: string;
  productDescription: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

export function StripeCheckout({
  amount,
  productTitle,
  productDescription,
  onPaymentSuccess,
  onPaymentError,
  onCancel
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const result = await stripePaymentService.createPaymentIntent({
          amount,
          metadata: {
            product_title: productTitle,
            product_description: productDescription,
          },
        });

        if (result.success && result.paymentIntent) {
          setClientSecret(result.paymentIntent.client_secret);
        } else {
          setError(result.error || 'Failed to create payment intent');
        }
      } catch (err) {
        setError('Failed to initialize payment');
        console.error('Payment intent creation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, productTitle, productDescription]);

  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing secure payment...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={onCancel} className="mt-4 w-full">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <Alert>
            <AlertDescription>
              Unable to initialize payment. Please try again.
            </AlertDescription>
          </Alert>
          <Button onClick={onCancel} className="mt-4 w-full">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Payment
        </CardTitle>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{productTitle}</p>
          <p className="text-lg font-semibold">${amount.toFixed(2)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: stripeConfig.appearance,
            loader: stripeConfig.loader,
          }}
        >
          <CheckoutForm
            clientSecret={clientSecret}
            amount={amount}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}