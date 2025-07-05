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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Edit, Trash2, LogIn, CreditCard, DollarSign, Banknote } from "lucide-react";
import MultiRoomModal from "@/components/reservations/multi-room-modal";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { PaymentHistory } from "@/components/payments/payment-history";

export default function Reservations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/reservations/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsEditStatusModalOpen(false);
      setSelectedReservation(null);
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
        description: "Failed to update reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/reservations/${id}`, { status: "checked-in" });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Guest checked in successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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
        description: "Failed to check in guest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/reservations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation cancelled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsDeleteDialogOpen(false);
      setSelectedReservation(null);
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
        description: "Failed to cancel reservation. Please try again.",
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

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleViewReservation = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsViewModalOpen(true);
  };

  const handleEditStatus = (reservation: any) => {
    setSelectedReservation(reservation);
    setNewStatus(reservation.status);
    setIsEditStatusModalOpen(true);
  };

  const handleEditReservation = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsEditModalOpen(true);
  };

  const handleDeleteReservation = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsDeleteDialogOpen(true);
  };

  const handleCheckIn = (reservation: any) => {
    checkInMutation.mutate(reservation.id);
  };

  const handleUpdateStatus = () => {
    if (selectedReservation && newStatus) {
      updateReservationMutation.mutate({
        id: selectedReservation.id,
        data: { status: newStatus },
      });
    }
  };

  const confirmDeleteReservation = () => {
    if (selectedReservation) {
      deleteReservationMutation.mutate(selectedReservation.id);
    }
  };

  // Check if reservation can be checked in
  const canCheckIn = (reservation: any) => {
    return reservation.status === "confirmed" || reservation.status === "pending";
  };

  const handlePayment = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsPaymentDialogOpen(true);
  };

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
          title="Reservations"
          subtitle="Manage bookings and availability"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Add Button Section */}
          <div className="mb-6">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Reservations</CardTitle>
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
                      <TableHead className="min-w-[120px]">Confirmation</TableHead>
                      <TableHead className="min-w-[100px]">Rooms</TableHead>
                      <TableHead className="min-w-[140px]">Check-in</TableHead>
                      <TableHead className="min-w-[140px]">Check-out</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Total</TableHead>
                      <TableHead className="min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations?.length ? (
                      reservations.map((reservation: any) => (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {reservation.guest.firstName}{" "}
                                {reservation.guest.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reservation.guest.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {reservation.confirmationNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {reservation.reservationRooms.length} Room
                                {reservation.reservationRooms.length > 1
                                  ? "s"
                                  : ""}
                              </div>
                              <div className="text-sm text-gray-500">
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
                                  {formatDateTime(
                                    reservation.reservationRooms[0].checkInDate,
                                  )}
                                </div>
                                {reservation.reservationRooms.length > 1 && (
                                  <div className="text-xs text-gray-500">
                                    +{reservation.reservationRooms.length - 1}{" "}
                                    more
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {reservation.reservationRooms.length > 0 && (
                              <div>
                                <div className="text-sm">
                                  {formatDateTime(
                                    reservation.reservationRooms[0]
                                      .checkOutDate,
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {calculateNights(
                                    reservation.reservationRooms[0].checkInDate,
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
                          <TableCell className="font-medium">
                            Rs.{parseFloat(reservation.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReservation(reservation)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canCheckIn(reservation) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCheckIn(reservation)}
                                  className="text-green-600 hover:text-green-800"
                                  disabled={checkInMutation.isPending}
                                  title="Check In"
                                >
                                  <LogIn className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePayment(reservation)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Process Payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditReservation(reservation)}
                                title="Edit Reservation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReservation(reservation)}
                                className="text-red-600 hover:text-red-800"
                                title="Cancel Reservation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-500"
                        >
                          No reservations found. Create your first reservation
                          to get started.
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

      <MultiRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <MultiRoomModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editData={selectedReservation}
        isEdit={true}
      />

      {/* View Reservation Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              {/* Guest Information */}
              <div>
                <h3 className="font-semibold mb-2">Guest Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedReservation.guest.firstName} {selectedReservation.guest.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedReservation.guest.email || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {selectedReservation.guest.phone || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">ID Type:</span> {selectedReservation.guest.idType?.replace("-", " ").toUpperCase() || "N/A"}
                  </div>
                </div>
              </div>

              {/* Reservation Information */}
              <div>
                <h3 className="font-semibold mb-2">Reservation Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Confirmation:</span> {selectedReservation.confirmationNumber}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {getStatusBadge(selectedReservation.status)}
                  </div>
                  <div>
                    <span className="font-medium">Total Amount:</span> Rs.{parseFloat(selectedReservation.totalAmount).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {formatDateTime(selectedReservation.createdAt)}
                  </div>
                </div>
              </div>

              {/* Room Information */}
              <div>
                <h3 className="font-semibold mb-2">Room Information</h3>
                <div className="space-y-3">
                  {selectedReservation.reservationRooms.map((roomReservation: any, index: number) => (
                    <div key={index} className="border rounded p-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Room:</span> {roomReservation.room.number} ({roomReservation.room.roomType.name})
                        </div>
                        <div>
                          <span className="font-medium">Guests:</span> {roomReservation.adults} Adults, {roomReservation.children} Children
                        </div>
                        <div>
                          <span className="font-medium">Check-in:</span> {formatDate(roomReservation.checkInDate)}
                        </div>
                        <div>
                          <span className="font-medium">Check-out:</span> {formatDate(roomReservation.checkOutDate)}
                        </div>
                        <div>
                          <span className="font-medium">Rate/Night:</span> Rs.{parseFloat(roomReservation.ratePerNight).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span> Rs.{parseFloat(roomReservation.totalAmount).toFixed(2)}
                        </div>
                        {roomReservation.specialRequests && (
                          <div className="col-span-2">
                            <span className="font-medium">Special Requests:</span> {roomReservation.specialRequests}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Payment Information</h3>
                  <Button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handlePayment(selectedReservation);
                    }}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Process Payment
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">Rs.{parseFloat(selectedReservation.totalAmount).toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm text-muted-foreground">Paid Amount</p>
                        <p className="text-2xl font-bold text-green-600">Rs.{parseFloat(selectedReservation.paidAmount || 0).toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Banknote className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-2xl font-bold text-orange-600">
                          Rs.{(parseFloat(selectedReservation.totalAmount) - parseFloat(selectedReservation.paidAmount || 0)).toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment History */}
                <PaymentHistory reservationId={selectedReservation.id} />
              </div>

              {selectedReservation.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm">{selectedReservation.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Status Modal */}
      <Dialog open={isEditStatusModalOpen} onOpenChange={setIsEditStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Reservation Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="checked-out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={updateReservationMutation.isPending}>
                {updateReservationMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel reservation "{selectedReservation?.confirmationNumber}"?
              This will mark the reservation as cancelled and free up the associated rooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReservation} disabled={deleteReservationMutation.isPending}>
              {deleteReservationMutation.isPending ? "Cancelling..." : "Cancel Reservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        reservation={selectedReservation}
        onPaymentSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
        }}
      />
    </div>
  );
}