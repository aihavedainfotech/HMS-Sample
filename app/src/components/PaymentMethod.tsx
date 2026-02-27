import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, QrCode, Smartphone, CheckCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethodProps {
    amount: number;
    onPaymentComplete: (paymentDetails: any) => void;
    onBack: () => void;
}

const PaymentMethod: React.FC<PaymentMethodProps> = ({ amount, onPaymentComplete, onBack }) => {
    const [paymentMethod, setPaymentMethod] = useState<string>('upi');
    const [isProcessing, setIsProcessing] = useState(false);

    // Card details state
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardHolder, setCardHolder] = useState('');

    // UPI details state
    const [upiId, setUpiId] = useState('');

    const handlePayment = () => {
        setIsProcessing(true);

        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);

            const transactionId = 'TXN' + Math.floor(Math.random() * 10000000000).toString();

            const paymentDetails = {
                method: paymentMethod,
                amount: amount,
                transactionId: transactionId,
                timestamp: new Date().toISOString(),
                ...(paymentMethod === 'card' ? { last4: cardNumber.slice(-4) } : {}),
                ...(paymentMethod === 'upi' ? { upiId: upiId } : {})
            };

            toast.success('Payment Successful!', {
                description: `Transaction ID: ${transactionId}`
            });

            onPaymentComplete(paymentDetails);
        }, 2000);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-6 w-6" />
                    Secure Payment
                </CardTitle>
                <CardDescription className="text-blue-100">
                    Complete your payment to confirm the appointment
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="mb-6 bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                    <span className="text-blue-800 font-medium">Total Amount to Pay</span>
                    <span className="text-2xl font-bold text-blue-700">₹{amount}</span>
                </div>

                <Tabs defaultValue="upi" value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6 h-14">
                        <TabsTrigger value="upi" className="flex flex-col items-center justify-center h-full gap-1">
                            <Smartphone className="h-4 w-4" />
                            UPI
                        </TabsTrigger>
                        <TabsTrigger value="card" className="flex flex-col items-center justify-center h-full gap-1">
                            <CreditCard className="h-4 w-4" />
                            Card
                        </TabsTrigger>
                        <TabsTrigger value="qr" className="flex flex-col items-center justify-center h-full gap-1">
                            <QrCode className="h-4 w-4" />
                            QR Code
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upi" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="upi-id">Enter UPI ID</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="upi-id"
                                    placeholder="username@bank"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                />
                                <Button variant="outline" onClick={() => setUpiId('patient@upi')}>
                                    Use Mock ID
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">e.g. 9876543210@ybl, username@okhdfcbank</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="card" className="space-y-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="card-number">Card Number</Label>
                                <Input
                                    id="card-number"
                                    placeholder="0000 0000 0000 0000"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expiry">Expiry Date</Label>
                                    <Input
                                        id="expiry"
                                        placeholder="MM/YY"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cvv">CVV</Label>
                                    <Input
                                        id="cvv"
                                        placeholder="123"
                                        type="password"
                                        maxLength={3}
                                        value={cvv}
                                        onChange={(e) => setCvv(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="card-holder">Card Holder Name</Label>
                                <Input
                                    id="card-holder"
                                    placeholder="John Doe"
                                    value={cardHolder}
                                    onChange={(e) => setCardHolder(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => {
                                setCardNumber('4242 4242 4242 4242');
                                setExpiryDate('12/28');
                                setCvv('123');
                                setCardHolder('Test User');
                            }}>Fill Mock Data</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="qr" className="space-y-6">
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg bg-gray-50">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                {/* Simulated QR Code */}
                                <div className="w-48 h-48 bg-gray-900 flex items-center justify-center text-white rounded-lg">
                                    <QrCode className="w-24 h-24" />
                                </div>
                            </div>
                            <p className="mt-4 text-sm font-medium text-center">Scan this QR code with any UPI app</p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">GPay</span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">PhonePe</span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">Paytm</span>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between p-6 bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={onBack} disabled={isProcessing}>
                    Back
                </Button>
                <Button
                    className="bg-green-600 hover:bg-green-700 min-w-[150px]"
                    onClick={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            Pay ₹{amount}
                            <CheckCircle className="h-4 w-4" />
                        </span>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default PaymentMethod;
