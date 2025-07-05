import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RecentReservations from "@/components/dashboard/recent-reservations";
import QuickActions from "@/components/dashboard/quick-actions";
import RoomStatusOverview from "@/components/dashboard/room-status-overview";
import BranchMetrics from "@/components/dashboard/branch-metrics";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, TrendingUp, Users, TrendingUp as RevenueIcon, Bed } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
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

  // Enhanced dashboard for super admin showing all branches performance
  const { data: superAdminMetrics } = useQuery({
    queryKey: ["/api/dashboard/super-admin-metrics"],
    enabled: isAuthenticated && (user as any)?.role === "superadmin",
  });

  const isSuperAdmin = (user as any)?.role === "superadmin";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Dashboard"
          subtitle={isSuperAdmin ? "Super Admin - All Branches Overview" : "Overview of hotel operations"}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Super Admin Global Overview */}
          {isSuperAdmin && superAdminMetrics && (
            <div className="mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminMetrics.totalBranches}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminMetrics.totalReservations}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue (All Time)</CardTitle>
                    <RevenueIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₨. {(superAdminMetrics.totalRevenue || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cumulative revenue from all branches</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                    <Bed className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{superAdminMetrics.totalRooms}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Branch Performance Cards */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Branch Performance
                  </CardTitle>
                  <CardDescription>
                    Real-time performance metrics across all hotel branches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {superAdminMetrics.branchMetrics?.map((branch: any) => (
                      <Card key={branch.branchId} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{branch.branchName}</CardTitle>
                            <Badge variant="outline">ID: {branch.branchId}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Occupancy Rate</span>
                            <span className="text-sm text-muted-foreground">{branch.occupancyRate}%</span>
                          </div>
                          <Progress value={branch.occupancyRate} className="h-2" />
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Reservations</div>
                              <div className="font-medium">{branch.totalReservations}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Available</div>
                              <div className="font-medium">{branch.availableRooms}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-muted-foreground">Today's Revenue</div>
                              <div className="font-medium text-green-600">Rs. {(branch.revenue || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <MetricsCards />
          
          {/* Show branch metrics only for super admin */}
          {!isSuperAdmin && user?.role === "superadmin" && <BranchMetrics />}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="lg:col-span-2">
              <RecentReservations />
            </div>
            <QuickActions />
          </div>
          
          <RoomStatusOverview />
        </main>
      </div>
    </div>
  );
}
