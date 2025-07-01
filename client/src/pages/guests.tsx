
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";

interface GuestFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idType: string;
  idNumber: string;
  address: string;
  nationality: string;
}

export default function Guests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [formData, setFormData] = useState<GuestFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
    address: "",
    nationality: "",
  });

  const { data: guests, isLoading: guestsLoading } = useQuery({
    queryKey: ["/api/guests"],
    enabled: isAuthenticated,
  });

  const createGuestMutation = useMutation({
    mutationFn: async (data: GuestFormData & { branchId: number }) => {
      return await apiRequest("POST", "/api/guests", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Guest created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create guest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GuestFormData> }) => {
      return await apiRequest("PUT", `/api/guests/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Guest updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update guest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/guests/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Guest deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      setIsDeleteDialogOpen(false);
      setSelectedGuest(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete guest. Please try again.",
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

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
      address: "",
      nationality: "",
    });
  };

  const handleCreateGuest = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const branchId = user?.role === "superadmin" ? 1 : user?.branchId;
    createGuestMutation.mutate({ ...formData, branchId });
  };

  const handleEditGuest = (guest: any) => {
    setSelectedGuest(guest);
    setFormData({
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
      email: guest.email || "",
      phone: guest.phone || "",
      idType: guest.idType || "passport",
      idNumber: guest.idNumber || "",
      address: guest.address || "",
      nationality: guest.nationality || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateGuest = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    updateGuestMutation.mutate({ id: selectedGuest.id, data: formData });
  };

  const handleDeleteGuest = (guest: any) => {
    setSelectedGuest(guest);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteGuest = () => {
    if (selectedGuest) {
      deleteGuestMutation.mutate(selectedGuest.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
          title="Guest Management"
          subtitle="Manage guest profiles and history"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Add Button Section */}
          <div className="mb-6">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Guest
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Guests</CardTitle>
            </CardHeader>
            <CardContent>
              {guestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>ID Type</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests?.length ? (
                      guests.map((guest: any) => (
                        <TableRow key={guest.id}>
                          <TableCell className="font-medium">
                            {guest.firstName} {guest.lastName}
                          </TableCell>
                          <TableCell>
                            {guest.email || "N/A"}
                          </TableCell>
                          <TableCell>
                            {guest.phone || "N/A"}
                          </TableCell>
                          <TableCell>
                            {guest.idType ? guest.idType.replace("-", " ").toUpperCase() : "N/A"}
                          </TableCell>
                          <TableCell>
                            {guest.nationality || "N/A"}
                          </TableCell>
                          <TableCell>
                            {formatDate(guest.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGuest(guest)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGuest(guest)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No guests found. Guests will appear here when reservations are created.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Create Guest Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="idType">ID Type</Label>
                <Select value={formData.idType} onValueChange={(value) => setFormData({ ...formData, idType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving-license">Driving License</SelectItem>
                    <SelectItem value="national-id">National ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGuest} disabled={createGuestMutation.isPending}>
                {createGuestMutation.isPending ? "Creating..." : "Create Guest"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Guest Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Phone *</Label>
              <Input
                id="editPhone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editIdType">ID Type</Label>
                <Select value={formData.idType} onValueChange={(value) => setFormData({ ...formData, idType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving-license">Driving License</SelectItem>
                    <SelectItem value="national-id">National ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editIdNumber">ID Number</Label>
                <Input
                  id="editIdNumber"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editAddress">Address</Label>
              <Input
                id="editAddress"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editNationality">Nationality</Label>
              <Input
                id="editNationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateGuest} disabled={updateGuestMutation.isPending}>
                {updateGuestMutation.isPending ? "Updating..." : "Update Guest"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the guest "{selectedGuest?.firstName} {selectedGuest?.lastName}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGuest} disabled={deleteGuestMutation.isPending}>
              {deleteGuestMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
