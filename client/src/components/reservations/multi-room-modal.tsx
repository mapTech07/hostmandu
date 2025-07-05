import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface RoomData {
  roomTypeId: string;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  specialRequests: string;
  ratePerNight: number;
  totalAmount: number;
}

interface MultiRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: any;
  isEdit?: boolean;
}

export default function MultiRoomModal({
  isOpen,
  onClose,
  editData,
  isEdit = false,
}: MultiRoomModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [guestData, setGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
  });

  const [existingGuest, setExistingGuest] = useState(null);
  const [isSearchingGuest, setIsSearchingGuest] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [rooms, setRooms] = useState<RoomData[]>([]);

  const { data: roomTypes } = useQuery({
    queryKey: ["/api/room-types"],
    enabled: isOpen && !!user,
  });

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    enabled: isOpen && !!user && user?.role === "superadmin",
  });

  const { data: hotelSettings } = useQuery({
    queryKey: ["/api/hotel-settings"],
    enabled: isOpen && !!user,
  });

  const getCurrentDateTime = () => {
    const timeZone = hotelSettings?.timeZone || 'Asia/Kathmandu';
    const now = new Date();

    // Format date according to timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    const hour = parts.find(part => part.type === 'hour')?.value;
    const minute = parts.find(part => part.type === 'minute')?.value;

    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const getDefaultCheckOut = () => {
    const timeZone = hotelSettings?.timeZone || 'Asia/Kathmandu';
    const now = new Date();
    now.setDate(now.getDate() + 1); // Default to next day

    // Format date according to timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    const hour = parts.find(part => part.type === 'hour')?.value;
    const minute = parts.find(part => part.type === 'minute')?.value;

    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  // Initialize rooms when hotel settings are loaded
  useEffect(() => {
    if (hotelSettings && rooms.length === 0) {
      setRooms([
        {
          roomTypeId: "",
          adults: 1,
          children: 0,
          checkInDate: getCurrentDateTime(),
          checkOutDate: getDefaultCheckOut(),
          specialRequests: "",
          ratePerNight: 0,
          totalAmount: 0,
        },
      ]);
    }
  }, [hotelSettings]);

  const {
    data: availableRooms,
    error: roomsError,
    isLoading: roomsLoading,
  } = useQuery({
    queryKey: ["/api/rooms", selectedBranchId || user?.branchId, "available"],
    queryFn: async () => {
      const branchId =
        user?.role === "superadmin" ? selectedBranchId : user?.branchId;
      if (!branchId) {
        console.log("No branchId available for fetching rooms");
        return [];
      }

      console.log("Fetching available rooms for branch:", branchId);
      console.log("User role:", user?.role);
      console.log("Selected branch ID:", selectedBranchId);
      console.log("User branch ID:", user?.branchId);

      try {
        const response = await apiRequest(
          "GET",
          `/api/rooms?branchId=${branchId}&status=available`,
        );
        if (!response.ok) {
          console.error("Room fetch failed with status:", response.status);
          throw new Error(`Failed to fetch rooms: ${response.status}`);
        }
        const rooms = await response.json();
        console.log("Available rooms fetched:", rooms);
        console.log("Number of rooms:", rooms?.length || 0);
        return rooms;
      } catch (error) {
        console.error("Error fetching rooms:", error);
        throw error;
      }
    },
    enabled: isOpen && !!user && !!(selectedBranchId || user?.branchId),
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/reservations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      onClose();
      resetForm();
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
        description: "Failed to create reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const searchGuestByPhone = async (phone: string) => {
    if (!phone || phone.length < 5) {
      setExistingGuest(null);
      return;
    }

    setIsSearchingGuest(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/guests?phone=${encodeURIComponent(phone)}`,
      );
      if (response.ok) {
        const guests = await response.json();
        if (guests && guests.length > 0) {
          const guest = guests[0];
          setExistingGuest(guest);
          // Auto-fill guest data from existing guest
          setGuestData({
            firstName: guest.firstName || "",
            lastName: guest.lastName || "",
            email: guest.email || "",
            phone: guest.phone || "",
            idType: guest.idType || "passport",
            idNumber: guest.idNumber || "",
          });
          toast({
            title: "Guest Found",
            description: `Found existing guest: ${guest.firstName} ${guest.lastName} (${guest.reservationCount || 0} previous reservations)`,
          });
        } else {
          setExistingGuest(null);
        }
      }
    } catch (error) {
      console.error("Error searching guest:", error);
      setExistingGuest(null);
    } finally {
      setIsSearchingGuest(false);
    }
  };

  const resetForm = () => {
    setGuestData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
    });
    setExistingGuest(null);
    setSelectedBranchId("");
    if (hotelSettings) {
      setRooms([
        {
          roomTypeId: "",
          adults: 1,
          children: 0,
          checkInDate: getCurrentDateTime(),
          checkOutDate: getDefaultCheckOut(),
          specialRequests: "",
          ratePerNight: 0,
          totalAmount: 0,
        },
      ]);
    }
  };

  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        roomTypeId: "",
        adults: 1,
        children: 0,
        checkInDate: getCurrentDateTime(),
        checkOutDate: getDefaultCheckOut(),
        specialRequests: "",
        ratePerNight: 0,
        totalAmount: 0,
      },
    ]);
  };

  const removeRoom = (index: number) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, i) => i !== index));
    }
  };

  const updateRoom = (index: number, field: keyof RoomData, value: any) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };

    // Calculate total amount when relevant fields change
    if (
      field === "roomTypeId" ||
      field === "checkInDate" ||
      field === "checkOutDate"
    ) {
      const selectedRoom = availableRooms?.find(
        (room: any) => room.id === parseInt(updatedRooms[index].roomTypeId),
      );
      if (
        selectedRoom &&
        updatedRooms[index].checkInDate &&
        updatedRooms[index].checkOutDate
      ) {
        const checkIn = new Date(updatedRooms[index].checkInDate);
        const checkOut = new Date(updatedRooms[index].checkOutDate);
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        const ratePerNight = parseFloat(selectedRoom.roomType.basePrice);
        updatedRooms[index].ratePerNight = ratePerNight;
        updatedRooms[index].totalAmount = ratePerNight * nights;
      }
    }

    setRooms(updatedRooms);
  };

  const calculateSummary = () => {
    const totalRooms = rooms.length;
    const totalNights = rooms.reduce((sum, room) => {
      if (room.checkInDate && room.checkOutDate) {
        const checkIn = new Date(room.checkInDate);
        const checkOut = new Date(room.checkOutDate);
        return (
          sum +
          Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
          )
        );
      }
      return sum;
    }, 0);
    const subtotal = rooms.reduce((sum, room) => sum + room.totalAmount, 0);
    const taxes = subtotal * 0.0; // 0% tax
    const total = subtotal + taxes;

    return { totalRooms, totalNights, subtotal, taxes, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const branchId =
      user?.role === "superadmin" ? parseInt(selectedBranchId) : user?.branchId;

    if (!branchId) {
      toast({
        title: "Error",
        description:
          user?.role === "superadmin"
            ? "Please select a branch."
            : "Branch information is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (!guestData.firstName || !guestData.lastName || !guestData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required guest information.",
        variant: "destructive",
      });
      return;
    }

    const invalidRoom = rooms.find(
      (room) => !room.roomTypeId || !room.checkInDate || !room.checkOutDate,
    );
    if (invalidRoom) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required room information.",
        variant: "destructive",
      });
      return;
    }

    const summary = calculateSummary();

    const reservationData = {
      guest: {
        ...guestData,
        branchId: branchId,
      },
      reservation: {
        branchId: branchId,
        status: "confirmed",
        totalAmount: summary.total.toString(),
        paidAmount: "0",
        notes: "",
      },
      rooms: rooms.map((room) => ({
        roomId: parseInt(room.roomTypeId),
        checkInDate: new Date(room.checkInDate),
        checkOutDate: new Date(room.checkOutDate),
        adults: room.adults,
        children: room.children,
        ratePerNight: room.ratePerNight.toString(),
        totalAmount: room.totalAmount.toString(),
        specialRequests: room.specialRequests,
      })),
    };

    createReservationMutation.mutate(reservationData);
  };

  const summary = calculateSummary();

  // Initialize form with edit data
  useEffect(() => {
    if (isEdit && editData && isOpen) {
      setGuestData({
        firstName: editData.guest.firstName || "",
        lastName: editData.guest.lastName || "",
        email: editData.guest.email || "",
        phone: editData.guest.phone || "",
        idType: editData.guest.idType || "passport",
        idNumber: editData.guest.idNumber || "",
      });

      setRooms(
        editData.reservationRooms.map((rr: any) => ({
          roomTypeId: rr.room.id.toString(),
          checkInDate: rr.checkInDate,
          checkOutDate: rr.checkOutDate,
          adults: rr.adults,
          children: rr.children,
          ratePerNight: parseFloat(rr.ratePerNight),
          totalAmount: parseFloat(rr.totalAmount),
          specialRequests: rr.specialRequests || "",
        })),
      );
    } else if (!isEdit && hotelSettings) {
      // Reset form for new reservation
      setGuestData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        idType: "passport",
        idNumber: "",
      });
      setRooms([
        {
          roomTypeId: "",
          adults: 1,
          children: 0,
          checkInDate: getCurrentDateTime(),
          checkOutDate: getDefaultCheckOut(),
          ratePerNight: 0,
          totalAmount: 0,
          specialRequests: "",
        },
      ]);
    }
  }, [isEdit, editData, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room Reservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch Selection for Superadmin */}
          {user?.role === "superadmin" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Branch Selection
              </h3>
              <div>
                <Label htmlFor="branchId">Select Branch *</Label>
                <Select
                  value={selectedBranchId}
                  onValueChange={(value) => setSelectedBranchId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Guest Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={guestData.firstName}
                  onChange={(e) =>
                    setGuestData({ ...guestData, firstName: e.target.value })
                  }
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={guestData.lastName}
                  onChange={(e) =>
                    setGuestData({ ...guestData, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestData.email}
                  onChange={(e) =>
                    setGuestData({ ...guestData, email: e.target.value })
                  }
                  placeholder="guest@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    value={guestData.phone}
                    onChange={(e) => {
                      const phone = e.target.value;
                      setGuestData({ ...guestData, phone });
                      // Search for existing guest after user stops typing
                      clearTimeout((window as any).guestSearchTimeout);
                      (window as any).guestSearchTimeout = setTimeout(() => {
                        searchGuestByPhone(phone);
                      }, 500);
                    }}
                    placeholder="+9779745673009"
                    required
                  />
                  {isSearchingGuest && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                {existingGuest && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    Found existing guest: {existingGuest.firstName}{" "}
                    {existingGuest.lastName} (
                    {existingGuest.reservationCount || 0} previous reservations)
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="idType">ID Type</Label>
                <Select
                  value={guestData.idType}
                  onValueChange={(value) =>
                    setGuestData({ ...guestData, idType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving-license">
                      Driving License
                    </SelectItem>
                    <SelectItem value="national-id">National ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  value={guestData.idNumber}
                  onChange={(e) =>
                    setGuestData({ ...guestData, idNumber: e.target.value })
                  }
                  placeholder="Enter ID number"
                />
              </div>
            </div>
          </div>

          {/* Room Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Room Selection
              </h3>
              <Button type="button" onClick={addRoom} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            {rooms.map((room, index) => (
              <Card key={index} className="mb-4">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Room {index + 1}
                    </CardTitle>
                    {rooms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoom(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Available Room *</Label>
                      {roomsError && (
                        <div className="text-red-500 text-sm mb-2">
                          Error loading rooms: {roomsError.message}
                        </div>
                      )}
                      <Select
                        value={room.roomTypeId}
                        onValueChange={(value) =>
                          updateRoom(index, "roomTypeId", value)
                        }
                        disabled={roomsLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              roomsLoading
                                ? "Loading rooms..."
                                : roomsError
                                  ? "Error loading rooms"
                                  : "Select available room"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {roomsLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading available rooms...
                            </SelectItem>
                          ) : roomsError ? (
                            <SelectItem value="error" disabled>
                              Error loading rooms
                            </SelectItem>
                          ) : availableRooms && availableRooms.length > 0 ? (
                            availableRooms.map((availableRoom: any) => (
                              <SelectItem
                                key={availableRoom.id}
                                value={availableRoom.id.toString()}
                              >
                                Room {availableRoom.number} -{" "}
                                {availableRoom.roomType.name} - Rs.
                                {parseFloat(
                                  availableRoom.roomType.basePrice,
                                ).toFixed(2)}
                                /night
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-rooms" disabled>
                              No available rooms found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {availableRooms && (
                        <div className="text-xs text-gray-500 mt-1">
                          {availableRooms.length} room(s) available
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`checkIn-${index}`}>
                          Check-in Date & Time *
                        </Label>
                        <Input
                          id={`checkIn-${index}`}
                          type="datetime-local"
                          value={room.checkInDate}
                          onChange={(e) =>
                            updateRoom(index, "checkInDate", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`checkOut-${index}`}>
                          Check-out Date & Time *
                        </Label>
                        <Input
                          id={`checkOut-${index}`}
                          type="datetime-local"
                          value={room.checkOutDate}
                          onChange={(e) =>
                            updateRoom(index, "checkOutDate", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Adults</Label>
                      <Select
                        value={room.adults.toString()}
                        onValueChange={(value) =>
                          updateRoom(index, "adults", parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Adult</SelectItem>
                          <SelectItem value="2">2 Adults</SelectItem>
                          <SelectItem value="3">3 Adults</SelectItem>
                          <SelectItem value="4">4 Adults</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Children</Label>
                      <Select
                        value={room.children.toString()}
                        onValueChange={(value) =>
                          updateRoom(index, "children", parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 Children</SelectItem>
                          <SelectItem value="1">1 Child</SelectItem>
                          <SelectItem value="2">2 Children</SelectItem>
                          <SelectItem value="3">3 Children</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Special Requests</Label>
                    <Textarea
                      value={room.specialRequests}
                      onChange={(e) =>
                        updateRoom(index, "specialRequests", e.target.value)
                      }
                      placeholder="Any special requirements for this room..."
                      rows={3}
                    />
                  </div>

                  {room.totalAmount > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Rate: Rs.{room.ratePerNight.toFixed(2)}/night
                      </p>
                      <p className="font-medium">
                        Room Total: Rs.{room.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reservation Summary */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Reservation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Rooms:</span>
                <span className="font-medium">{summary.totalRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Nights:</span>
                <span className="font-medium">{summary.totalNights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  Rs.{summary.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes & Fees:</span>
                <span className="font-medium">
                  Rs.{summary.taxes.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2">
                <span className="font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="font-bold text-lg text-primary">
                  Rs.{summary.total.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReservationMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createReservationMutation.isPending
                ? "Creating..."
                : "Confirm Reservation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}