import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, Smartphone, Building } from "lucide-react";

const paymentSchema = z.object({
  paymentType: z.enum(["advance", "partial", "full", "credit"]),
  paymentMethod: z.enum(["cash", "card", "online", "bank-transfer"]),
  amount: z.string().min(1, "Amount is required"),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  onPaymentSuccess?: () => void;
}

export function PaymentDialog({
  isOpen,
  onClose,
  reservation,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentType: "partial",
      paymentMethod: "cash",
      amount: "",
      transactionReference: "",
      notes: "",
      dueDate: "",
    },
  });

  const paymentTypeBadgeColor = {
    advance: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    partial: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    full: "bg-green-100 text-green-800 hover:bg-green-200",
    credit: "bg-red-100 text-red-800 hover:bg-red-200",
  };

  const paymentMethodIcons = {
    cash: <Banknote className="h-4 w-4" />,
    card: <CreditCard className="h-4 w-4" />,
    online: <Smartphone className="h-4 w-4" />,
    "bank-transfer": <Building className="h-4 w-4" />,
  };

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return await apiRequest("POST", `/api/reservations/${reservation.id}/payments`, data);
    },
    onSuccess: () => {
      toast({
        title: "Payment Processed",
        description: "Payment has been successfully recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/reservations/${reservation.id}/payments`] });
      onPaymentSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Convert dueDate string to Date object if present
      const processedData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      await createPaymentMutation.mutateAsync(processedData);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!reservation) return null;

  const totalAmount = parseFloat(reservation.totalAmount) || 0;
  const paidAmount = parseFloat(reservation.paidAmount) || 0;
  const remainingAmount = totalAmount - paidAmount;
  const selectedPaymentType = form.watch("paymentType");
  const selectedAmount = parseFloat(form.watch("amount") || "0");

  // Suggested amount based on payment type
  const getSuggestedAmount = (type: string) => {
    switch (type) {
      case "advance":
        return Math.round(totalAmount * 0.3); // 30% advance
      case "partial":
        return Math.round(remainingAmount * 0.5); // 50% of remaining
      case "full":
        return remainingAmount;
      case "credit":
        return remainingAmount;
      default:
        return 0;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment - {reservation.confirmationNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reservation Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Guest:</span>
                <span className="font-medium">
                  {reservation.guest?.firstName} {reservation.guest?.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Amount:</span>
                <span className="font-medium">Rs.{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Paid Amount:</span>
                <span className="font-medium text-green-600">Rs.{paidAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Remaining Balance:</span>
                <span className="font-bold text-lg">
                  Rs.{remainingAmount.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Payment Type Selection */}
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(["advance", "partial", "full", "credit"] as const).map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={field.value === type ? "default" : "outline"}
                          className="h-12 flex-col gap-1"
                          onClick={() => {
                            field.onChange(type);
                            form.setValue("amount", getSuggestedAmount(type).toString());
                          }}
                        >
                          <Badge
                            variant="secondary"
                            className={`text-xs ${paymentTypeBadgeColor[type]}`}
                          >
                            {type}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method Selection */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(["cash", "card", "online", "bank-transfer"] as const).map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={field.value === method ? "default" : "outline"}
                          className="h-12 flex items-center gap-2"
                          onClick={() => field.onChange(method)}
                        >
                          {paymentMethodIcons[method]}
                          <span className="capitalize">
                            {method.replace("-", " ")}
                          </span>
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Rs.)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max={remainingAmount}
                          placeholder="Enter amount"
                          className="pl-8"
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          Rs.
                        </span>
                      </div>
                    </FormControl>
                    {selectedAmount > remainingAmount && (
                      <p className="text-sm text-red-600">
                        Amount cannot exceed remaining balance of Rs.{remainingAmount.toFixed(2)}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Transaction Reference */}
              <FormField
                control={form.control}
                name="transactionReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Reference (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter transaction ID or reference number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date for Credit Payments */}
              {selectedPaymentType === "credit" && (
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add any additional notes about this payment..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || selectedAmount <= 0 || selectedAmount > remainingAmount}
                  className="flex-1"
                >
                  {isProcessing ? "Processing..." : `Process Payment (Rs.${selectedAmount.toFixed(2)})`}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}