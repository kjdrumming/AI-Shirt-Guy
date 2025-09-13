import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
}

interface ShippingFormProps {
  onSubmit: (address: ShippingAddress) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Address validation service
class AddressValidationService {
  // Using a free address validation API (you can replace with your preferred service)
  static async validateAddress(address: Partial<ShippingAddress>) {
    try {
      // For demo purposes, we'll use a simple validation
      // In production, you'd use services like:
      // - Google Places API
      // - USPS Address Validation
      // - SmartyStreets
      // - Lob Address Verification

      const requiredFields = ['address1', 'city', 'region', 'zip', 'country'];
      const missingFields = requiredFields.filter(field => !address[field as keyof ShippingAddress]);
      
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          suggestions: []
        };
      }

      // Basic format validation
      const zipRegex = address.country === 'US' ? /^\d{5}(-\d{4})?$/ : /^.{3,10}$/;
      if (!zipRegex.test(address.zip || '')) {
        return {
          isValid: false,
          error: 'Invalid postal code format',
          suggestions: []
        };
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        isValid: true,
        verified: true,
        normalized: {
          ...address,
          // Normalize the address format
          address1: address.address1?.toUpperCase(),
          city: address.city?.toUpperCase(),
          region: address.region?.toUpperCase(),
        },
        suggestions: []
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Unable to validate address. Please check your input.',
        suggestions: []
      };
    }
  }
}

export function ShippingAddressForm({ onSubmit, onCancel, isLoading = false }: ShippingFormProps) {
  const [address, setAddress] = useState<ShippingAddress>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: 'US',
    region: '',
    address1: '',
    address2: '',
    city: '',
    zip: ''
  });

  const [validation, setValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error: string | null;
    verified: boolean;
  }>({
    isValidating: false,
    isValid: null,
    error: null,
    verified: false
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    // Add more countries as needed
  ];

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 
    'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const validateField = (field: keyof ShippingAddress, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Invalid email format';
        } else {
          delete newErrors.email;
        }
        break;
      case 'phone':
        if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
          newErrors.phone = 'Invalid phone number';
        } else {
          delete newErrors.phone;
        }
        break;
      case 'zip':
        if (address.country === 'US' && value && !/^\d{5}(-\d{4})?$/.test(value)) {
          newErrors.zip = 'US ZIP code should be 5 or 9 digits (e.g., 12345 or 12345-6789)';
        } else {
          delete newErrors.zip;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    
    // Reset validation when address changes
    if (validation.isValid) {
      setValidation(prev => ({ ...prev, isValid: null, verified: false }));
    }
  };

  const validateAddress = async () => {
    setValidation(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const result = await AddressValidationService.validateAddress(address);
      
      if (result.isValid) {
        setValidation({
          isValidating: false,
          isValid: true,
          error: null,
          verified: result.verified || false
        });
        
        if (result.normalized) {
          setAddress(prev => ({ ...prev, ...result.normalized }));
        }
      } else {
        setValidation({
          isValidating: false,
          isValid: false,
          error: result.error || 'Address validation failed',
          verified: false
        });
      }
    } catch (error) {
      setValidation({
        isValidating: false,
        isValid: false,
        error: 'Unable to validate address',
        verified: false
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validation.isValid && Object.keys(errors).length === 0) {
      onSubmit(address);
    }
  };

  const isFormValid = validation.isValid && Object.keys(errors).length === 0 && 
    address.first_name && address.last_name && address.email && address.phone &&
    address.address1 && address.city && address.region && address.zip;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Shipping Address
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={address.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={address.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={address.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={address.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Address Information */}
          <div>
            <Label htmlFor="country">Country *</Label>
            <select
              id="country"
              value={address.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="address1">Street Address *</Label>
            <Input
              id="address1"
              value={address.address1}
              onChange={(e) => handleInputChange('address1', e.target.value)}
              placeholder="123 Main Street"
              required
            />
          </div>

          <div>
            <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
            <Input
              id="address2"
              value={address.address2}
              onChange={(e) => handleInputChange('address2', e.target.value)}
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="region">{address.country === 'US' ? 'State' : 'Region'} *</Label>
              {address.country === 'US' ? (
                <select
                  id="region"
                  value={address.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select State</option>
                  {usStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id="region"
                  value={address.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  required
                />
              )}
            </div>
            <div>
              <Label htmlFor="zip">{address.country === 'US' ? 'ZIP Code' : 'Postal Code'} *</Label>
              <Input
                id="zip"
                value={address.zip}
                onChange={(e) => handleInputChange('zip', e.target.value)}
                placeholder={address.country === 'US' ? '12345' : 'Postal Code'}
                required
              />
              {errors.zip && <p className="text-sm text-red-500 mt-1">{errors.zip}</p>}
            </div>
          </div>

          {/* Address Validation */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={validateAddress}
              disabled={validation.isValidating || !address.address1 || !address.city || !address.zip}
              className="w-full"
            >
              {validation.isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validate Address
            </Button>

            {validation.isValid === true && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ Address verified and ready for shipping
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid === false && validation.error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  ❌ {validation.error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Payment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}