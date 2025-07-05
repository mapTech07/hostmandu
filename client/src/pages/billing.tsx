import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Printer,
  CreditCard,
  Receipt,
  Clock,
  Calendar,
  AlertCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { PaymentHistory } from "@/components/payments/payment-history";
import { formatCurrency } from "@/lib/currency";

export default function Billing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editedDates, setEditedDates] = useState<{
    [key: string]: { checkIn: string; checkOut: string };
  }>({});
  const [billData, setBillData] = useState({
    additionalCharges: 0,
    discount: 0,
    tax: 0,
    paymentMethod: "cash",
    notes: "",
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
  });

  // Get payment history for selected reservation
  const { data: selectedReservationPayments } = useQuery({
    queryKey: [`/api/reservations/${selectedReservation?.id}/payments`],
    enabled: !!selectedReservation?.id,
  });

  const { data: hotelSettings } = useQuery({
    queryKey: ["/api/hotel-settings"],
    enabled: isAuthenticated,
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/reservations/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dates updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      setIsEditingDates(false);
      setEditedDates({});
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update dates. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: "Confirmed", className: "reservation-confirmed" },
      pending: { label: "Pending", className: "reservation-pending" },
      "checked-in": {
        label: "Checked In",
        className: "reservation-checked-in",
      },
      "checked-out": {
        label: "Checked Out",
        className: "reservation-checked-out",
      },
      cancelled: { label: "Cancelled", className: "reservation-cancelled" },
      "no-show": { label: "No Show", className: "reservation-no-show" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTimeInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateNewAmount = (
    roomReservation: any,
    newCheckIn: string,
    newCheckOut: string,
  ) => {
    const nights = calculateNights(newCheckIn, newCheckOut);
    const ratePerNight = parseFloat(roomReservation.ratePerNight);
    return nights * ratePerNight;
  };

  const handleCreateBill = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsBillModalOpen(true);
    setShowPaymentHistory(false);
    setIsEditingDates(false);
    setEditedDates({});
  };

  const handlePayment = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsPaymentDialogOpen(true);
  };

  const handleViewPaymentHistory = (reservation: any) => {
    setSelectedReservation(reservation);
    setShowPaymentHistory(true);
    setIsBillModalOpen(true);
  };

  const handleToggleEditDates = () => {
    if (!isEditingDates && selectedReservation) {
      // Initialize edited dates with current values or current datetime for checkout
      const newEditedDates: {
        [key: string]: { checkIn: string; checkOut: string };
      } = {};
      selectedReservation.reservationRooms.forEach((roomRes: any) => {
        let checkOutDate = roomRes.checkOutDate;

        // If checking out, use current date/time in the configured timezone
        if (selectedReservation.status === "checked-in") {
          const timeZone = hotelSettings?.timeZone || "Asia/Kathmandu";
          const now = new Date();

          // Format date according to timezone
          const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          const parts = formatter.formatToParts(now);
          const year = parts.find((part) => part.type === "year")?.value;
          const month = parts.find((part) => part.type === "month")?.value;
          const day = parts.find((part) => part.type === "day")?.value;
          const hour = parts.find((part) => part.type === "hour")?.value;
          const minute = parts.find((part) => part.type === "minute")?.value;

          checkOutDate = `${year}-${month}-${day}T${hour}:${minute}`;
        }

        newEditedDates[roomRes.id] = {
          checkIn: roomRes.checkInDate,
          checkOut: checkOutDate,
        };
      });
      setEditedDates(newEditedDates);
    }
    setIsEditingDates(!isEditingDates);
  };

  const handleDateChange = (
    roomId: string,
    field: "checkIn" | "checkOut",
    value: string,
  ) => {
    setEditedDates((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value,
      },
    }));
  };

  const handleSaveDates = async () => {
    if (!selectedReservation) return;

    try {
      // Calculate new total amount
      let newTotalAmount = 0;
      const updatedRooms = selectedReservation.reservationRooms.map(
        (roomRes: any) => {
          const editedDate = editedDates[roomRes.id];
          if (editedDate) {
            const newAmount = calculateNewAmount(
              roomRes,
              editedDate.checkIn,
              editedDate.checkOut,
            );
            newTotalAmount += newAmount;
            return {
              ...roomRes,
              checkInDate: editedDate.checkIn,
              checkOutDate: editedDate.checkOut,
              totalAmount: newAmount.toString(),
            };
          }
          newTotalAmount += parseFloat(roomRes.totalAmount);
          return roomRes;
        },
      );

      // Update reservation with new dates and total amount
      await updateReservationMutation.mutateAsync({
        id: selectedReservation.id,
        data: {
          totalAmount: newTotalAmount.toString(),
          reservationRooms: updatedRooms,
        },
      });

      // Update selected reservation to reflect changes
      setSelectedReservation({
        ...selectedReservation,
        totalAmount: newTotalAmount.toString(),
        reservationRooms: updatedRooms,
      });
    } catch (error) {
      console.error("Error updating dates:", error);
    }
  };

  const handlePrintBill = () => {
    if (!selectedReservation) return;

    const billWindow = window.open("", "_blank");
    const billContent = generateBillHTML();
    billWindow?.document.write(billContent);
    billWindow?.document.close();
    billWindow?.print();
  };

  const generateBillHTML = () => {
    if (!selectedReservation) return "";

    const totalAmount = parseFloat(selectedReservation.totalAmount);
    const paidAmount = parseFloat(selectedReservation.paidAmount || 0);
    const remainingAmount = totalAmount - paidAmount;
    const isPaid = remainingAmount <= 0;
    const currentDateTime = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Bill - ${selectedReservation.confirmationNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            margin: 0;
            line-height: 1.4;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .hotel-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
          }
          .bill-title {
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            color: #333;
          }
          .bill-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .guest-details, .bill-details {
            flex: 1;
          }
          .guest-details {
            margin-right: 20px;
          }
          .detail-label {
            font-weight: bold;
            color: #333;
          }
          .room-details {
            margin-bottom: 20px;
          }
          .room-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .room-table th, .room-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .room-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .room-table td:last-child {
            text-align: right;
          }
          .total-section {
            margin-top: 20px;
            text-align: right;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .subtotal-row {
            margin-bottom: 5px;
          }
          .total-row {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #333;
            font-size: 18px;
          }
          .payment-status {
            margin: 20px 0;
            padding: 15px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            border-radius: 5px;
          }
          .payment-status.paid {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .payment-status.unpaid {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">HOTEL MANAGEMENT SYSTEM</div>
          <div class="bill-title">HOTEL BILL / INVOICE</div>
        </div>

        <div class="bill-info">
          <div class="guest-details">
            <div><span class="detail-label">Guest Name:</span> ${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}</div>
            <div><span class="detail-label">Email:</span> ${selectedReservation.guest.email || "N/A"}</div>
            <div><span class="detail-label">Phone:</span> ${selectedReservation.guest.phone || "N/A"}</div>
          </div>
          <div class="bill-details">
            <div><span class="detail-label">Confirmation Number:</span> ${selectedReservation.confirmationNumber}</div>
            <div><span class="detail-label">Bill Date:</span> ${currentDateTime}</div>
            <div><span class="detail-label">Check-in:</span> ${selectedReservation.reservationRooms[0] ? formatDateTime(selectedReservation.reservationRooms[0].checkInDate) : "N/A"}</div>
            <div><span class="detail-label">Check-out:</span> ${selectedReservation.reservationRooms[0] ? formatDateTime(selectedReservation.reservationRooms[0].checkOutDate) : "N/A"}</div>
          </div>
        </div>

        <div class="room-details">
          <h3>Room Details</h3>
          <table class="room-table">
            <thead>
              <tr>
                <th>Room Number</th>
                <th>Room Type</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Rate/Night</th>
                <th>Nights</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${selectedReservation.reservationRooms
                .map(
                  (roomRes: any) => `
                <tr>
                  <td>${roomRes.room.number}</td>
                  <td>${roomRes.room.roomType.name}</td>
                  <td>${formatDateTime(roomRes.checkInDate)}</td>
                  <td>${formatDateTime(roomRes.checkOutDate)}</td>
                  <td>Rs.${parseFloat(roomRes.ratePerNight).toFixed(2)}</td>
                  <td>${calculateNights(roomRes.checkInDate, roomRes.checkOutDate)}</td>
                  <td>Rs.${parseFloat(roomRes.totalAmount).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="total-section">
          <div class="subtotal-row">Subtotal: Rs.${totalAmount.toFixed(2)}</div>
          <div class="total-row">
            <strong>TOTAL AMOUNT: Rs.${totalAmount.toFixed(2)}</strong>
          </div>
        </div>

        <div class="payment-status ${isPaid ? "paid" : "unpaid"}">
          PAYMENT STATUS: ${isPaid ? "PAID IN FULL" : "PAYMENT PENDING"}
        </div>

        <div class="footer">
          <p>Thank you for choosing our hotel!</p>
          <p>For any queries regarding this bill, please contact the front desk.</p>
        </div>
      </body>
      </html>
    `;
  };

  const filteredReservations = reservations?.filter((reservation: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reservation.guest.firstName.toLowerCase().includes(searchLower) ||
      reservation.guest.lastName.toLowerCase().includes(searchLower) ||
      reservation.guest.email?.toLowerCase().includes(searchLower) ||
      reservation.confirmationNumber.toLowerCase().includes(searchLower)
    );
  });

  const getCurrencySymbol = (currency: string) => {
    return "Rs.";
  };

  const currencySymbol = "Rs.";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Billing & Payments"
          subtitle="Manage guest checkout, billing and payment processing"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Search Section */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reservations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Guest Reservations & Payment Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {reservationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Guest</TableHead>
                        <TableHead className="min-w-[120px]">
                          Confirmation
                        </TableHead>
                        <TableHead className="min-w-[100px]">Rooms</TableHead>
                        <TableHead className="min-w-[120px]">
                          Check-out
                        </TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">
                          Payment Status
                        </TableHead>
                        <TableHead className="min-w-[100px]">Total</TableHead>
                        <TableHead className="min-w-[100px]">Paid</TableHead>
                        <TableHead className="min-w-[100px]">Balance</TableHead>
                        <TableHead className="min-w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReservations?.length ? (
                        filteredReservations.map((reservation: any) => (
                          <TableRow key={reservation.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm sm:text-base">
                                  {reservation.guest.firstName}{" "}
                                  {reservation.guest.lastName}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500">
                                  {reservation.guest.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs sm:text-sm">
                              {reservation.confirmationNumber}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">
                                  {reservation.reservationRooms.length} Room
                                  {reservation.reservationRooms.length > 1
                                    ? "s"
                                    : ""}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {reservation.reservationRooms
                                    .map((rr: any) => rr.room.roomType.name)
                                    .join(", ")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {reservation.reservationRooms.length > 0 && (
                                <div>
                                  <div className="text-sm">
                                    {formatDate(
                                      reservation.reservationRooms[0]
                                        .checkOutDate,
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {calculateNights(
                                      reservation.reservationRooms[0]
                                        .checkInDate,
                                      reservation.reservationRooms[0]
                                        .checkOutDate,
                                    )}{" "}
                                    nights
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(reservation.status)}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const totalAmount =
                                  parseFloat(reservation.totalAmount) || 0;
                                const paidAmount = parseFloat(
                                  reservation.paidAmount || 0,
                                );
                                const balance = Math.max(
                                  0,
                                  totalAmount - paidAmount,
                                );

                                if (paidAmount === 0) {
                                  return (
                                    <Badge
                                      variant="destructive"
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <AlertCircle className="h-3 w-3" />
                                      Unpaid
                                    </Badge>
                                  );
                                } else if (balance > 0.01) {
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <Clock className="h-3 w-3" />
                                      Partial
                                    </Badge>
                                  );
                                } else {
                                  return (
                                    <Badge
                                      variant="default"
                                      className="flex items-center gap-1 bg-green-600 text-xs"
                                    >
                                      Paid
                                    </Badge>
                                  );
                                }
                              })()}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {currencySymbol}
                              {parseFloat(reservation.totalAmount).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-medium text-green-600 text-sm">
                              {currencySymbol}
                              {parseFloat(reservation.paidAmount || 0).toFixed(
                                2,
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-orange-600 text-sm">
                              {currencySymbol}
                              {(() => {
                                const totalAmount =
                                  parseFloat(reservation.totalAmount) || 0;
                                const paidAmount = parseFloat(
                                  reservation.paidAmount || 0,
                                );
                                const balance = Math.max(
                                  0,
                                  totalAmount - paidAmount,
                                );
                                return balance.toFixed(2);
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCreateBill(reservation)}
                                  title={
                                    reservation.status === "checked-out"
                                      ? "View bill"
                                      : "Create bill"
                                  }
                                  className="p-2"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                                {(() => {
                                  const totalAmount = parseFloat(
                                    reservation.totalAmount,
                                  );
                                  const paidAmount = parseFloat(
                                    reservation.paidAmount || 0,
                                  );
                                  const isFullyPaid =
                                    totalAmount - paidAmount <= 0;

                                  return isFullyPaid ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReservation(reservation);
                                        handlePrintBill();
                                      }}
                                      title="Print bill"
                                      className="p-2"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePayment(reservation)}
                                      title="Process payment"
                                      className="p-2"
                                    >
                                      <CreditCard className="h-4 w-4" />
                                    </Button>
                                  );
                                })()}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleViewPaymentHistory(reservation)
                                  }
                                  title="Payment history"
                                  className="p-2"
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center py-8 text-gray-500"
                          >
                            No reservations found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Billing Modal */}
      <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-lg sm:text-xl">
                {showPaymentHistory
                  ? "Payment History"
                  : selectedReservation?.status === "checked-out"
                    ? "View Bill"
                    : "Create Bill"}{" "}
                - {selectedReservation?.confirmationNumber}
              </span>
              <div className="flex flex-wrap gap-2">
                {!showPaymentHistory &&
                  selectedReservation?.status === "checked-in" && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-dates"
                        checked={isEditingDates}
                        onCheckedChange={handleToggleEditDates}
                      />
                      <Label htmlFor="edit-dates" className="text-sm">
                        Edit Dates
                      </Label>
                    </div>
                  )}
                {!showPaymentHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentHistory(true)}
                    className="text-xs sm:text-sm"
                  >
                    <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
                    Payment History
                  </Button>
                )}
                {showPaymentHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentHistory(false)}
                    className="text-xs sm:text-sm"
                  >
                    <Receipt className="h-4 w-4 mr-1 sm:mr-2" />
                    View Bill
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4 sm:space-y-6">
              {showPaymentHistory ? (
                <div className="space-y-4">
                  {/* Payment Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Total Amount
                          </p>
                          <p className="text-lg sm:text-2xl font-bold">
                            {currencySymbol}
                            {parseFloat(
                              selectedReservation.totalAmount,
                            ).toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="text-center">
                          <CreditCard className="h-6 sm:h-8 w-6 sm:w-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Paid Amount
                          </p>
                          <p className="text-lg sm:text-2xl font-bold text-green-600">
                            {currencySymbol}
                            {parseFloat(
                              selectedReservation.paidAmount || 0,
                            ).toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="text-center">
                          <AlertCircle className="h-6 sm:h-8 w-6 sm:w-8 mx-auto mb-2 text-orange-600" />
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Remaining
                          </p>
                          <p className="text-lg sm:text-2xl font-bold text-orange-600">
                            {currencySymbol}
                            {(() => {
                              const totalAmount = parseFloat(
                                selectedReservation.totalAmount,
                              );
                              const paidAmount = parseFloat(
                                selectedReservation.paidAmount || 0,
                              );
                              return (totalAmount - paidAmount).toFixed(2);
                            })()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment History */}
                  <PaymentHistory reservationId={selectedReservation.id} />

                  {/* Process Payment Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={() => {
                        setIsBillModalOpen(false);
                        handlePayment(selectedReservation);
                      }}
                      disabled={(() => {
                        const totalAmount = parseFloat(
                          selectedReservation.totalAmount,
                        );
                        const paidAmount = parseFloat(
                          selectedReservation.paidAmount || 0,
                        );
                        return totalAmount - paidAmount <= 0;
                      })()}
                      className="w-full sm:w-auto"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Process New Payment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Bill Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold">
                      HOTEL BILL
                    </h2>
                    <p className="text-sm text-gray-600">
                      Confirmation: {selectedReservation.confirmationNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Date: {new Date().toLocaleDateString()}
                    </p>
                  </div>

                  {/* Guest Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Guest Information</h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Name:</span>{" "}
                          {selectedReservation.guest.firstName}{" "}
                          {selectedReservation.guest.lastName}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span>{" "}
                          {selectedReservation.guest.email || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Phone:</span>{" "}
                          {selectedReservation.guest.phone || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Stay Information</h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Check-in:</span>{" "}
                          {selectedReservation.reservationRooms[0]
                            ? formatDateTime(
                                selectedReservation.reservationRooms[0]
                                  .checkInDate,
                              )
                            : "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Check-out:</span>{" "}
                          {selectedReservation.reservationRooms[0]
                            ? formatDateTime(
                                selectedReservation.reservationRooms[0]
                                  .checkOutDate,
                              )
                            : "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Nights:</span>{" "}
                          {selectedReservation.reservationRooms[0]
                            ? calculateNights(
                                selectedReservation.reservationRooms[0]
                                  .checkInDate,
                                selectedReservation.reservationRooms[0]
                                  .checkOutDate,
                              )
                            : 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Room Details */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Room Details</h3>
                      {isEditingDates && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingDates(false);
                              setEditedDates({});
                            }}
                            className="text-xs"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveDates}
                            disabled={updateReservationMutation.isPending}
                            className="text-xs"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {updateReservationMutation.isPending
                              ? "Saving..."
                              : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Room
                              </th>
                              <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Type
                              </th>
                              <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Check-in
                              </th>
                              <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Check-out
                              </th>
                              <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Rate/Night
                              </th>
                              <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Nights
                              </th>
                              <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedReservation.reservationRooms.map(
                              (roomRes: any, index: number) => {
                                const editedDate = editedDates[roomRes.id];
                                const checkInDate =
                                  editedDate?.checkIn || roomRes.checkInDate;
                                const checkOutDate =
                                  editedDate?.checkOut || roomRes.checkOutDate;
                                const nights = calculateNights(
                                  checkInDate,
                                  checkOutDate,
                                );
                                const totalAmount = editedDate
                                  ? calculateNewAmount(
                                      roomRes,
                                      checkInDate,
                                      checkOutDate,
                                    )
                                  : parseFloat(roomRes.totalAmount);

                                return (
                                  <tr key={index} className="border-t">
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                      {roomRes.room.number}
                                    </td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                      {roomRes.room.roomType.name}
                                    </td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                      {isEditingDates ? (
                                        <Input
                                          type="datetime-local"
                                          value={formatDateTimeInput(
                                            checkInDate,
                                          )}
                                          onChange={(e) =>
                                            handleDateChange(
                                              roomRes.id,
                                              "checkIn",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full text-xs"
                                        />
                                      ) : (
                                        formatDateTime(checkInDate)
                                      )}
                                    </td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                      {isEditingDates ? (
                                        <Input
                                          type="datetime-local"
                                          value={formatDateTimeInput(
                                            checkOutDate,
                                          )}
                                          onChange={(e) =>
                                            handleDateChange(
                                              roomRes.id,
                                              "checkOut",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full text-xs"
                                        />
                                      ) : (
                                        formatDateTime(checkOutDate)
                                      )}
                                    </td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                      {currencySymbol}
                                      {parseFloat(roomRes.ratePerNight).toFixed(
                                        2,
                                      )}
                                    </td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                      {nights}
                                    </td>
                                    <td className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">
                                      {currencySymbol}
                                      {totalAmount.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Bill Summary */}
                  <div className="border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-full sm:w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span className="font-medium">
                            {currencySymbol}
                            {(() => {
                              if (
                                isEditingDates &&
                                Object.keys(editedDates).length > 0
                              ) {
                                let total = 0;
                                selectedReservation.reservationRooms.forEach(
                                  (roomRes: any) => {
                                    const editedDate = editedDates[roomRes.id];
                                    if (editedDate) {
                                      total += calculateNewAmount(
                                        roomRes,
                                        editedDate.checkIn,
                                        editedDate.checkOut,
                                      );
                                    } else {
                                      total += parseFloat(roomRes.totalAmount);
                                    }
                                  },
                                );
                                return total.toFixed(2);
                              }
                              return parseFloat(
                                selectedReservation.totalAmount,
                              ).toFixed(2);
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold text-base sm:text-lg">
                          <span>Total Amount:</span>
                          <span>
                            {currencySymbol}
                            {(() => {
                              if (
                                isEditingDates &&
                                Object.keys(editedDates).length > 0
                              ) {
                                let total = 0;
                                selectedReservation.reservationRooms.forEach(
                                  (roomRes: any) => {
                                    const editedDate = editedDates[roomRes.id];
                                    if (editedDate) {
                                      total += calculateNewAmount(
                                        roomRes,
                                        editedDate.checkIn,
                                        editedDate.checkOut,
                                      );
                                    } else {
                                      total += parseFloat(roomRes.totalAmount);
                                    }
                                  },
                                );
                                return total.toFixed(2);
                              }
                              return parseFloat(
                                selectedReservation.totalAmount,
                              ).toFixed(2);
                            })()}
                          </span>
                        </div>
                        <div className="text-green-600 flex justify-between text-sm">
                          <span>Paid Amount:</span>
                          <span className="font-medium">
                            {currencySymbol}
                            {parseFloat(
                              selectedReservation.paidAmount || 0,
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-orange-600 border-t pt-2 flex justify-between">
                          <span className="font-medium">Balance Due:</span>
                          <span className="font-bold">
                            {currencySymbol}
                            {(() => {
                              let totalAmount = parseFloat(
                                selectedReservation.totalAmount,
                              );
                              if (
                                isEditingDates &&
                                Object.keys(editedDates).length > 0
                              ) {
                                totalAmount = 0;
                                selectedReservation.reservationRooms.forEach(
                                  (roomRes: any) => {
                                    const editedDate = editedDates[roomRes.id];
                                    if (editedDate) {
                                      totalAmount += calculateNewAmount(
                                        roomRes,
                                        editedDate.checkIn,
                                        editedDate.checkOut,
                                      );
                                    } else {
                                      totalAmount += parseFloat(
                                        roomRes.totalAmount,
                                      );
                                    }
                                  },
                                );
                              }
                              const paidAmount = parseFloat(
                                selectedReservation.paidAmount || 0,
                              );
                              const balance = Math.max(
                                0,
                                totalAmount - paidAmount,
                              );
                              return balance.toFixed(2);
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsBillModalOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrintBill}
                      className="w-full sm:w-auto"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Bill
                    </Button>
                    {(() => {
                      let totalAmount = parseFloat(
                        selectedReservation.totalAmount,
                      );
                      if (
                        isEditingDates &&
                        Object.keys(editedDates).length > 0
                      ) {
                        totalAmount = 0;
                        selectedReservation.reservationRooms.forEach(
                          (roomRes: any) => {
                            const editedDate = editedDates[roomRes.id];
                            if (editedDate) {
                              totalAmount += calculateNewAmount(
                                roomRes,
                                editedDate.checkIn,
                                editedDate.checkOut,
                              );
                            } else {
                              totalAmount += parseFloat(roomRes.totalAmount);
                            }
                          },
                        );
                      }
                      const paidAmount = parseFloat(
                        selectedReservation.paidAmount || 0,
                      );
                      const isFullyPaid = totalAmount - paidAmount <= 0;

                      return isFullyPaid ? (
                        <div className="flex items-center text-green-600 font-medium justify-center sm:justify-start">
                          Payment Complete
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setIsBillModalOpen(false);
                            handlePayment(selectedReservation);
                          }}
                          className="w-full sm:w-auto"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process Payment
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        reservation={selectedReservation}
        onPaymentSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
          queryClient.invalidateQueries({
            queryKey: [`/api/reservations/${selectedReservation?.id}/payments`],
          });
        }}
      />
    </div>
  );
}
