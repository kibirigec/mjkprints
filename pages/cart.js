import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { getProductImage } from '../lib/supabase';

// Wrapper component to access PayPal script loading state
const PayPalButtonWrapper = ({ email, emailError, handlePayPalCreateOrder, handlePayPalApprove, handlePayPalError }) => {
  const [{ isPending }] = usePayPalScriptReducer();

  return (
    <>
      {isPending && (
        <div className="flex justify-center items-center p-4">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      <div style={{ display: isPending ? 'none' : 'block' }}>
        <PayPalButtons
          disabled={!email || !!emailError}
          style={{ layout: "vertical", color: "blue", shape: "rect", label: "checkout", height: 50, tagline: false }}
          createOrder={handlePayPalCreateOrder}
          onApprove={handlePayPalApprove}
          onError={handlePayPalError}
        />
      </div>
    </>
  );
};

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, getTotal } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (emailValue) => {
    if (!emailValue) return 'Email is required';
    if (!emailValue.includes('@') || !emailValue.includes('.') || emailValue.length < 5) return 'Please enter a valid email address';
    return '';
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handlePayPalCreateOrder = async () => {
    if (validateEmail(email)) {
      throw new Error('Invalid email');
    }
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, email, billingDetails: { email, name: 'Guest Customer' } }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      const responseData = await response.json();
      if (responseData.paypalOrderId) {
        return responseData.paypalOrderId;
      } else {
        throw new Error(responseData.error || 'Failed to create PayPal order');
      }
    } catch (error) {
      throw new Error(error.message || 'Failed to create PayPal order');
    }
  };

  const handlePayPalApprove = async (data, actions) => {
    setIsCheckingOut(true);
    try {
      const details = await actions.order.capture();
      const orderId = details.purchase_units?.[0]?.reference_id;
      if (orderId) {
        router.push(`/success?paypal_order_id=${data.orderID}&order_id=${orderId}`);
      } else {
        throw new Error('Order ID not found in payment details');
      }
    } catch (error) {
      alert(`Payment processing failed: ${error.message || 'Please contact support.'}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePayPalError = (error) => {
    alert(`Payment failed: ${error.message || 'Please try again.'}`);
    setIsCheckingOut(false);
  };

  const paypalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    currency: "USD",
    intent: "capture"
  };

  return (
    <>
      <Head>
        <title>Shopping Cart - MJK Prints</title>
      </Head>
      <PayPalScriptProvider options={paypalOptions}>
        <div className="min-h-screen bg-accent">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">Shopping Cart</h1>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <h2 className="text-2xl font-semibold text-primary mb-4">Your cart is empty</h2>
                <Link href="/" className="btn-primary">Continue Shopping</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={getProductImage(item, 'medium')?.url || '/api/placeholder/300/300'} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 64px, 80px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-primary">{item.title}</h3>
                          <p className="text-primary font-semibold text-lg mt-1 sm:mt-2">${item.price}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-primary mb-6">Order Summary</h3>
                    <div className="border-t pt-4 mb-6">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total:</span>
                        <span className="text-primary">${getTotal().toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input type="email" value={email} onChange={handleEmailChange} placeholder="your@email.com" className={`w-full px-3 py-3 border rounded-lg ${emailError ? 'border-red-300' : (email && !emailError ? 'border-green-300' : 'border-gray-300')}`} required />
                      {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                      <p className="text-xs text-gray-500 mt-1">Download links will be sent to this email.</p>
                    </div>
                    <div className="mb-4">
                      {email && !emailError ? (
                        <PayPalButtonWrapper 
                          email={email}
                          emailError={emailError}
                          handlePayPalCreateOrder={handlePayPalCreateOrder}
                          handlePayPalApprove={handlePayPalApprove}
                          handlePayPalError={handlePayPalError}
                        />
                      ) : (
                        <div className="text-center p-4 h-[74px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed">
                          <p className="text-sm text-gray-600">Please enter your email to checkout</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
          <Footer />
        </div>
      </PayPalScriptProvider>
    </>
  );
}