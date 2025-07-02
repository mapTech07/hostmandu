import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Calendar, DollarSign, Receipt, Clock } from "lucide-react";
import { format } from "date-fns";

interface PaymentHistoryProps {
  reservationId: string;
  className?: string;
}

export function PaymentHistory({ reservationId, className }: PaymentHistoryProps) {
  const { data: payments, isLoading } = useQuery({
    queryKey: [`/api/reservations/${reservationId}/payments`],
    enabled: !!reservationId,
  });

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "advance":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "full":
        return "bg-green-100 text-green-800 border-green-200";
      case "credit":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "cash":
        return "bg-green-50 text-green-700 border-green-200";
      case "card":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "online":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "bank-transfer":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "refunded":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payments recorded yet</p>
            <p className="text-sm">Payment history will appear here once payments are made</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payments.reduce((sum: number, payment: any) => {
    return payment.status === "completed" ? sum + parseFloat(payment.amount) : sum;
  }, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </div>
          <Badge variant="outline" className="text-sm">
            {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Total Paid</span>
            </div>
            <span className="text-lg font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Payment List */}
        <div className="space-y-3">
          {payments.map((payment: any, index: number) => (
            <div key={payment.id || index} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={getPaymentTypeColor(payment.paymentType)}
                  >
                    {payment.paymentType}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={getPaymentMethodColor(payment.paymentMethod)}
                  >
                    {payment.paymentMethod.replace("-", " ")}
                  </Badge>
                </div>
                <Badge 
                  variant="outline" 
                  className={getStatusColor(payment.status)}
                >
                  {payment.status}
                </Badge>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  ${parseFloat(payment.amount).toFixed(2)}
                </span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(payment.paymentDate), "MMM dd, yyyy 'at' h:mm a")}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {payment.transactionReference && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-mono">{payment.transactionReference}</span>
                  </div>
                )}

                {payment.dueDate && payment.paymentType === "credit" && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(payment.dueDate), "MMM dd, yyyy")}
                    </div>
                  </div>
                )}

                {payment.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1 text-sm">{payment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Table view for larger screens */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: any, index: number) => (
                <TableRow key={payment.id || index}>
                  <TableCell>
                    {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getPaymentTypeColor(payment.paymentType)}
                    >
                      {payment.paymentType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getPaymentMethodColor(payment.paymentMethod)}
                    >
                      {payment.paymentMethod.replace("-", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    ${parseFloat(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(payment.status)}
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.transactionReference || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}