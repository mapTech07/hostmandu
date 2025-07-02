import {
  users,
  branches,
  rooms,
  roomTypes,
  guests,
  reservations,
  reservationRooms,
  hotelSettings,
  pushSubscriptions,
  notificationHistory,
  type User,
  type UpsertUser,
  type Branch,
  type InsertBranch,
  type Room,
  type InsertRoom,
  type RoomType,
  type InsertRoomType,
  type Guest,
  type InsertGuest,
  type Reservation,
  type InsertReservation,
  type ReservationRoom,
  type InsertReservationRoom,
  type HotelSettings,
  type InsertHotelSettings,
  type PushSubscription,
  type InsertPushSubscription,
  type NotificationHistory,
  type InsertNotificationHistory,
  payments,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, between, sql, ilike, notInArray } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;

  // Branch operations
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch>;

  // Room operations
  getRooms(branchId?: number, status?: string): Promise<(Room & { roomType: RoomType; branch: Branch })[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room>;
  getRoomsByBranch(branchId: number): Promise<Room[]>;

  // Room type operations
  getRoomTypes(branchId?: number): Promise<RoomType[]>;
  getRoomType(id: number): Promise<RoomType | undefined>;
  createRoomType(roomType: InsertRoomType): Promise<RoomType>;
  updateRoomType(id: number, roomType: Partial<InsertRoomType>): Promise<RoomType>;

  // Guest operations
  getGuests(branchId?: number): Promise<Guest[]>;
  getGuest(id: number): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest>;
  searchGuests(query: string, branchId?: number): Promise<Guest[]>;

  // Reservation operations
  getReservations(branchId?: number): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] })[]>;
  getReservation(id: string): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] }) | undefined>;
  createReservation(reservation: InsertReservation, rooms: InsertReservationRoom[]): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation>;

  // Dashboard metrics
  getDashboardMetrics(branchId?: number): Promise<{
    totalReservations: number;
    occupancyRate: number;
    revenueToday: number;
    availableRooms: number;
    roomStatusCounts: Record<string, number>;
  }>;

  // Super admin dashboard metrics (all branches)
  getSuperAdminDashboardMetrics(): Promise<{
    totalBranches: number;
    totalReservations: number;
    totalRevenue: number;
    totalRooms: number;
    branchMetrics: Array<{
      branchId: number;
      branchName: string;
      totalReservations: number;
      occupancyRate: number;
      revenue: number;
      availableRooms: number;
    }>;
  }>;

  // Room availability
  getAvailableRooms(branchId: number, checkIn: string, checkOut: string): Promise<Room[]>;

  // Hotel settings operations
  getHotelSettings(branchId?: number): Promise<HotelSettings | undefined>;
  upsertHotelSettings(settings: InsertHotelSettings): Promise<HotelSettings>;

  getUserByEmail(email: string): Promise<User | undefined>;

  // Push subscription operations
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(userId: string, endpoint: string): Promise<void>;
  getAllAdminSubscriptions(): Promise<(PushSubscription & { user: User })[]>;
  clearAllPushSubscriptions(): Promise<void>;

  // Notification history operations
  getNotificationHistory(userId: string, limit?: number): Promise<NotificationHistory[]>;
  createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory>;
  markNotificationAsRead(notificationId: number, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Payment operations
  getPayments(reservationId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByReservation(reservationId: string): Promise<Payment[]>;
  updatePaymentStatus(paymentId: number, status: string): Promise<Payment>;
  getReservationWithPayments(id: string): Promise<(Reservation & { 
    guest: Guest; 
    reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[];
    payments: Payment[];
  }) | undefined>;

  // Advanced analytics operations
  getRevenueAnalytics(branchId?: number, period?: string): Promise<{
    dailyRevenue: Array<{ date: string; revenue: number; bookings: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number; bookings: number }>;
    totalRevenue: number;
    averageBookingValue: number;
    revenueGrowth: number;
  }>;
  
  getOccupancyAnalytics(branchId?: number, period?: string): Promise<{
    dailyOccupancy: Array<{ date: string; occupancyRate: number; totalRooms: number; occupiedRooms: number }>;
    monthlyOccupancy: Array<{ month: string; occupancyRate: number }>;
    averageOccupancy: number;
    peakOccupancyDays: Array<{ date: string; occupancyRate: number }>;
  }>;
  
  getGuestAnalytics(branchId?: number): Promise<{
    totalGuests: number;
    newGuestsThisMonth: number;
    returningGuests: number;
    guestGrowth: number;
    topGuests: Array<{ guest: Guest; totalBookings: number; totalSpent: number }>;
    guestsByNationality: Array<{ nationality: string; count: number }>;
  }>;
  
  getRoomPerformanceAnalytics(branchId?: number): Promise<{
    roomTypePerformance: Array<{
      roomType: RoomType;
      totalBookings: number;
      totalRevenue: number;
      averageRate: number;
      occupancyRate: number;
    }>;
    roomPerformance: Array<{
      room: Room & { roomType: RoomType };
      totalBookings: number;
      totalRevenue: number;
      occupancyRate: number;
      maintenanceRequests: number;
    }>;
  }>;
  
  getOperationalAnalytics(branchId?: number): Promise<{
    checkInTrends: Array<{ hour: number; count: number }>;
    checkOutTrends: Array<{ hour: number; count: number }>;
    averageStayDuration: number;
    cancellationRate: number;
    noShowRate: number;
    reservationsBySource: Array<{ source: string; count: number }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  db: any;
  constructor() {
    this.db = db;
  }
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName, users.lastName);
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Branch operations
  async getBranches(): Promise<Branch[]> {
    return await this.db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await this.db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await this.db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch> {
    const [updatedBranch] = await this.db
      .update(branches)
      .set({ ...branch, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    return updatedBranch;
  }

  // Room operations
  async getRooms(branchId?: number, status?: string): Promise<(Room & { roomType: RoomType; branch: Branch })[]> {
    const conditions = [eq(rooms.isActive, true)];

    if (branchId) {
      conditions.push(eq(rooms.branchId, branchId));
    }

    if (status) {
      conditions.push(sql`${rooms.status} = ${status}`);
    }

    const query = this.db.query.rooms.findMany({
      with: {
        roomType: true,
        branch: true,
      },
      where: and(...conditions),
      orderBy: [rooms.branchId, rooms.number],
    });

    return await query;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await this.db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await this.db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async getRoomsByBranch(branchId: number): Promise<Room[]> {
    return await this.db.select().from(rooms)
      .where(and(eq(rooms.branchId, branchId), eq(rooms.isActive, true)))
      .orderBy(rooms.number);
  }

  // Room type operations
  async getRoomTypes(branchId?: number): Promise<RoomType[]> {
    let conditions = [eq(roomTypes.isActive, true)];
    if (branchId) {
      conditions.push(eq(roomTypes.branchId, branchId));
    }
    return await this.db.select().from(roomTypes)
      .where(and(...conditions))
      .orderBy(roomTypes.name);
  }

  async getRoomType(id: number): Promise<RoomType | undefined> {
    const [roomType] = await this.db.select().from(roomTypes).where(eq(roomTypes.id, id));
    return roomType;
  }

  async createRoomType(roomType: InsertRoomType): Promise<RoomType> {
    const [newRoomType] = await this.db.insert(roomTypes).values(roomType).returning();
    return newRoomType;
  }

  async updateRoomType(id: number, roomType: Partial<InsertRoomType>): Promise<RoomType> {
    const [updatedRoomType] = await this.db
      .update(roomTypes)
      .set({
        ...roomType,
        updatedAt: new Date(),
      })
      .where(eq(roomTypes.id, id))
      .returning();
    return updatedRoomType;
  }

  // Guest operations
  async getGuests(branchId?: number): Promise<Guest[]> {
    let conditions = [eq(guests.isActive, true)];
    if (branchId) {
      conditions.push(eq(guests.branchId, branchId));
    }
    return await this.db.select().from(guests)
      .where(and(...conditions))
      .orderBy(desc(guests.createdAt));
  }

  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await this.db.select().from(guests).where(eq(guests.id, id));
    return guest;
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [newGuest] = await this.db.insert(guests).values(guest).returning();
    return newGuest;
  }

  async updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest> {
    const [updatedGuest] = await this.db
      .update(guests)
      .set({ ...guest, updatedAt: new Date() })
      .where(eq(guests.id, id))
      .returning();
    return updatedGuest;
  }

  async searchGuests(query: string, branchId?: number): Promise<Guest[]> {
    const searchCondition = or(
      ilike(guests.firstName, `%${query}%`),
      ilike(guests.lastName, `%${query}%`),
      ilike(guests.email, `%${query}%`),
      ilike(guests.phone, `%${query}%`)
    );

    const conditions = branchId
      ? and(searchCondition, eq(guests.branchId, branchId))
      : searchCondition;

    return await this.db.select().from(guests).where(conditions).limit(10);
  }

  // Reservation operations
  async getReservations(branchId?: number): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] })[]> {
    const query = this.db.query.reservations.findMany({
      with: {
        guest: true,
        reservationRooms: {
          with: {
            room: {
              with: {
                roomType: true,
              },
            },
          },
        },
      },
      where: branchId ? eq(reservations.branchId, branchId) : undefined,
      orderBy: desc(reservations.createdAt),
    });

    return await query;
  }

  async getReservation(id: string): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] }) | undefined> {
    return await this.db.query.reservations.findFirst({
      with: {
        guest: true,
        reservationRooms: {
          with: {
            room: {
              with: {
                roomType: true,
              },
            },
          },
        },
      },
      where: eq(reservations.id, id),
    });
  }

  async createReservation(reservation: InsertReservation, roomsData: InsertReservationRoom[]): Promise<Reservation> {
    return await this.db.transaction(async (tx: any) => {
      const [newReservation] = await tx.insert(reservations).values(reservation).returning();

      const roomsWithReservationId = roomsData.map(room => ({
        ...room,
        reservationId: newReservation.id,
      }));

      await tx.insert(reservationRooms).values(roomsWithReservationId);

      // Update guest reservation count
      await tx
        .update(guests)
        .set({
          reservationCount: sql`${guests.reservationCount} + 1`,
        })
        .where(eq(guests.id, reservation.guestId));

      return newReservation;
    });
  }

  async updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation> {
    const [updatedReservation] = await this.db
      .update(reservations)
      .set({ ...reservation, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updatedReservation;
  }

  // Dashboard metrics
  async getDashboardMetrics(branchId?: number): Promise<{
    totalReservations: number;
    occupancyRate: number;
    revenueToday: number;
    availableRooms: number;
    roomStatusCounts: Record<string, number>;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total reservations (active reservations only)
    let totalReservationsQuery = this.db
      .select({ count: sql`count(*)`.as('count') })
      .from(reservations)
      .where(sql`${reservations.status} != 'cancelled'`);

    if (branchId) {
      totalReservationsQuery = totalReservationsQuery.where(eq(reservations.branchId, branchId));
    }

    const [{ count: totalReservations }] = await totalReservationsQuery;

    // Room status counts with proper filtering
    let roomStatusQuery = this.db
      .select({
        status: rooms.status,
        count: sql`count(*)`.as('count'),
      })
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .groupBy(rooms.status);

    if (branchId) {
      roomStatusQuery = roomStatusQuery.where(eq(rooms.branchId, branchId));
    }

    const statusResults = await roomStatusQuery;
    const roomStatusCounts = statusResults.reduce((acc, { status, count }) => {
      acc[status] = Number(count);
      return acc;
    }, {} as Record<string, number>);

    const availableRooms = roomStatusCounts['available'] || 0;
    const occupiedRooms = roomStatusCounts['occupied'] || 0;
    const maintenanceRooms = roomStatusCounts['maintenance'] || 0;
    const totalRooms = availableRooms + occupiedRooms + maintenanceRooms;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Revenue today - sum of paid amounts for today's reservations (check-ins today or active today)
    let revenueTodayQuery = this.db
      .select({ total: sql`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`.as('total') })
      .from(reservations)
      .innerJoin(reservationRooms, eq(reservations.id, reservationRooms.reservationId))
      .where(
        and(
          sql`DATE(${reservationRooms.checkInDate}) <= ${today}`,
          sql`DATE(${reservationRooms.checkOutDate}) >= ${today}`,
          sql`${reservations.status} != 'cancelled'`
        )
      );

    if (branchId) {
      revenueTodayQuery = revenueTodayQuery.where(eq(reservations.branchId, branchId));
    }

    const [{ total: revenueToday }] = await revenueTodayQuery;

    return {
      totalReservations: Number(totalReservations),
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      revenueToday: Number(revenueToday || 0),
      availableRooms,
      roomStatusCounts,
    };
  }

  // Super admin dashboard metrics
  async getSuperAdminDashboardMetrics(): Promise<{
    totalBranches: number;
    totalReservations: number;
    totalRevenue: number;
    totalRooms: number;
    branchMetrics: Array<{
      branchId: number;
      branchName: string;
      totalReservations: number;
      occupancyRate: number;
      revenue: number;
      availableRooms: number;
    }>;
  }> {
    // Get all branches
    const branchesData = await this.db.select().from(branches).where(eq(branches.isActive, true));

    // Get global metrics - total active reservations
    const [{ count: totalReservations }] = await this.db
      .select({ count: sql`count(*)`.as('count') })
      .from(reservations)
      .where(sql`${reservations.status} != 'cancelled'`);

    // Total revenue from all paid amounts across all time and branches
    const [{ total: totalRevenue }] = await this.db
      .select({ total: sql`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`.as('total') })
      .from(reservations)
      .where(sql`${reservations.status} != 'cancelled'`);

    const [{ count: totalRooms }] = await this.db
      .select({ count: sql`count(*)`.as('count') })
      .from(rooms)
      .where(eq(rooms.isActive, true));

    // Get metrics per branch
    const branchMetrics = await Promise.all(
      branchesData.map(async (branch) => {
        const metrics = await this.getDashboardMetrics(branch.id);

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalReservations: metrics.totalReservations,
          occupancyRate: metrics.occupancyRate,
          revenue: metrics.revenueToday,
          availableRooms: metrics.availableRooms,
        };
      })
    );

    return {
      totalBranches: branchesData.length,
      totalReservations: Number(totalReservations),
      totalRevenue: Number(totalRevenue),
      totalRooms: Number(totalRooms),
      branchMetrics,
    };
  }

  // Room availability
  async getAvailableRooms(branchId: number, checkIn: string, checkOut: string): Promise<Room[]> {
    const reservedRoomIds = await this.db
      .select({ roomId: reservationRooms.roomId })
      .from(reservationRooms)
      .where(
        or(
          and(
            sql`${reservationRooms.checkInDate} <= ${checkIn}`,
            sql`${reservationRooms.checkOutDate} > ${checkIn}`
          ),
          and(
            sql`${reservationRooms.checkInDate} < ${checkOut}`,
            sql`${reservationRooms.checkOutDate} >= ${checkOut}`
          ),
          and(
            sql`${reservationRooms.checkInDate} >= ${checkIn}`,
            sql`${reservationRooms.checkOutDate} <= ${checkOut}`
          )
        )
      );

    const reservedIds = reservedRoomIds.map(r => r.roomId);

    const availableRoomsQuery = this.db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.branchId, branchId),
          eq(rooms.isActive, true),
          sql`${rooms.status} = 'available'`,
          reservedIds.length > 0 ? notInArray(rooms.id, reservedIds) : sql`1=1`
        )
      );

    return await availableRoomsQuery;
  }

  // Hotel settings operations
  async getHotelSettings(branchId?: number): Promise<HotelSettings | undefined> {
    const [settings] = await this.db
      .select()
      .from(hotelSettings)
      .where(
        branchId
          ? eq(hotelSettings.branchId, branchId)
          : sql`${hotelSettings.branchId} IS NULL`
      )
      .orderBy(desc(hotelSettings.createdAt))
      .limit(1);
    return settings;
  }

  async upsertHotelSettings(settings: InsertHotelSettings): Promise<HotelSettings> {
    const existingSettings = await this.getHotelSettings(settings.branchId || undefined);

    if (existingSettings) {
      const [updatedSettings] = await this.db
        .update(hotelSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(hotelSettings.id, existingSettings.id))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await this.db
        .insert(hotelSettings)
        .values(settings)
        .returning();
      return newSettings;
    }
  }

  // Push subscription operations
  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  // Push subscription methods
  async getPushSubscription(userId: string, endpoint: string): Promise<PushSubscription | null> {
    const result = await this.db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
      .limit(1);
    return result[0] || null;
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [newSubscription] = await this.db
      .insert(pushSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }

  async clearAllPushSubscriptions(): Promise<void> {
    await this.db.delete(pushSubscriptions);
  }

  // async getAllAdminSubscriptions(): Promise<(PushSubscription & { user: User })[]> {
  //   return await this.db
  //     .select({
  //       id: pushSubscriptions.id,
  //       userId: pushSubscriptions.userId,
  //       endpoint: pushSubscriptions.endpoint,
  //       p256dh: pushSubscriptions.p256dh,
  //       auth: pushSubscriptions.auth,
  //       createdAt: pushSubscriptions.createdAt,
  //       user: users,
  //     })
  //     .from(pushSubscriptions)
  //     .innerJoin(users, eq(pushSubscriptions.userId, users.id))
  //     .where(sql`${users.role} IN ('superadmin', 'branch-admin')`);
  // }
  async getAllAdminSubscriptions(): Promise<(PushSubscription & { user: User })[]> {
    try {
      console.log('🔍 Fetching all admin subscriptions...');
      
      const result = await this.db
        .select({
          id: pushSubscriptions.id,
          userId: pushSubscriptions.userId,
          endpoint: pushSubscriptions.endpoint,
          p256dh: pushSubscriptions.p256dh,
          auth: pushSubscriptions.auth,
          createdAt: pushSubscriptions.createdAt,
          user: users,
        })
        .from(pushSubscriptions)
        .innerJoin(users, eq(pushSubscriptions.userId, users.id))
        .where(and(
          or(eq(users.role, 'superadmin'), eq(users.role, 'branch-admin')),
          eq(users.isActive, true)
        ));

      console.log(`📊 Found ${result.length} admin subscriptions`);
      
      // Log details for debugging
      result.forEach((sub, index) => {
        console.log(`👤 Admin subscription ${index + 1}: User ${sub.userId} (${sub.user?.email}) - Role: ${sub.user?.role}`);
      });

      return result;
    } catch (error) {
      console.error('❌ Error fetching admin subscriptions:', error);
      throw error;
    }
  }

  // Notification history operations
  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationHistory[]> {
    return await this.db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.sentAt))
      .limit(limit);
  }

  async createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory> {
    const [newNotification] = await this.db
      .insert(notificationHistory)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    await this.db
      .update(notificationHistory)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notificationHistory.id, notificationId), eq(notificationHistory.userId, userId)));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.db
      .update(notificationHistory)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notificationHistory.userId, userId), eq(notificationHistory.isRead, false)));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notificationHistory)
      .where(and(eq(notificationHistory.userId, userId), eq(notificationHistory.isRead, false)));
    return result[0]?.count || 0;
  }

  // Advanced analytics operations
  async getRevenueAnalytics(branchId?: number, period: string = '30d'): Promise<{
    dailyRevenue: Array<{ date: string; revenue: number; bookings: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number; bookings: number }>;
    totalRevenue: number;
    averageBookingValue: number;
    revenueGrowth: number;
  }> {
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    let baseQuery = this.db
      .select({
        date: sql<string>`DATE(${reservations.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`,
        bookings: sql<number>`COUNT(*)`
      })
      .from(reservations)
      .where(
        and(
          sql`${reservations.createdAt} >= ${startDate.toISOString()}`,
          sql`${reservations.status} != 'cancelled'`
        )
      )
      .groupBy(sql`DATE(${reservations.createdAt})`)
      .orderBy(sql`DATE(${reservations.createdAt})`);

    if (branchId) {
      baseQuery = baseQuery.where(eq(reservations.branchId, branchId));
    }

    const dailyRevenue = await baseQuery;

    // Monthly revenue for the past 12 months
    const yearAgo = new Date();
    yearAgo.setMonth(yearAgo.getMonth() - 12);
    
    let monthlyQuery = this.db
      .select({
        month: sql<string>`TO_CHAR(${reservations.createdAt}, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`,
        bookings: sql<number>`COUNT(*)`
      })
      .from(reservations)
      .where(
        and(
          sql`${reservations.createdAt} >= ${yearAgo.toISOString()}`,
          sql`${reservations.status} != 'cancelled'`
        )
      )
      .groupBy(sql`TO_CHAR(${reservations.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${reservations.createdAt}, 'YYYY-MM')`);

    if (branchId) {
      monthlyQuery = monthlyQuery.where(eq(reservations.branchId, branchId));
    }

    const monthlyRevenue = await monthlyQuery;

    // Total revenue
    let totalRevenueQuery = this.db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(reservations)
      .where(sql`${reservations.status} != 'cancelled'`);

    if (branchId) {
      totalRevenueQuery = totalRevenueQuery.where(eq(reservations.branchId, branchId));
    }

    const [totalStats] = await totalRevenueQuery;
    const totalRevenue = totalStats.total;
    const averageBookingValue = totalStats.count > 0 ? totalRevenue / totalStats.count : 0;

    // Calculate growth (comparing last month to previous month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const previousMonth = lastMonth.toISOString().slice(0, 7);

    const currentMonthRevenue = monthlyRevenue.find(m => m.month === currentMonth)?.revenue || 0;
    const previousMonthRevenue = monthlyRevenue.find(m => m.month === previousMonth)?.revenue || 0;
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    return {
      dailyRevenue,
      monthlyRevenue,
      totalRevenue,
      averageBookingValue,
      revenueGrowth
    };
  }

  async getOccupancyAnalytics(branchId?: number, period: string = '30d'): Promise<{
    dailyOccupancy: Array<{ date: string; occupancyRate: number; totalRooms: number; occupiedRooms: number }>;
    monthlyOccupancy: Array<{ month: string; occupancyRate: number }>;
    averageOccupancy: number;
    peakOccupancyDays: Array<{ date: string; occupancyRate: number }>;
  }> {
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get total rooms for the branch
    let totalRoomsQuery = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(rooms)
      .where(eq(rooms.isActive, true));

    if (branchId) {
      totalRoomsQuery = totalRoomsQuery.where(eq(rooms.branchId, branchId));
    }

    const [{ count: totalRooms }] = await totalRoomsQuery;

    // Daily occupancy calculation
    const dailyOccupancy = [];
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      let occupiedQuery = this.db
        .select({ count: sql<number>`COUNT(DISTINCT ${reservationRooms.roomId})` })
        .from(reservationRooms)
        .innerJoin(reservations, eq(reservationRooms.reservationId, reservations.id))
        .where(
          and(
            sql`${reservationRooms.checkInDate} <= ${dateStr}`,
            sql`${reservationRooms.checkOutDate} > ${dateStr}`,
            sql`${reservations.status} IN ('confirmed', 'checked-in')`
          )
        );

      if (branchId) {
        occupiedQuery = occupiedQuery.where(eq(reservations.branchId, branchId));
      }

      const [{ count: occupiedRooms }] = await occupiedQuery;
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      dailyOccupancy.push({
        date: dateStr,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalRooms,
        occupiedRooms
      });
    }

    // Monthly occupancy for the past 12 months
    const monthlyOccupancy = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      
      // Calculate average occupancy for the month
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      let monthlyOccupiedQuery = this.db
        .select({ 
          avgOccupancy: sql<number>`AVG(daily_occupied.occupied_count)` 
        })
        .from(
          sql`(
            SELECT DATE(generate_series(${monthStart.toISOString()}::date, ${monthEnd.toISOString()}::date, '1 day'::interval)) as date,
            COUNT(DISTINCT ${reservationRooms.roomId}) as occupied_count
            FROM generate_series(${monthStart.toISOString()}::date, ${monthEnd.toISOString()}::date, '1 day'::interval) dates
            LEFT JOIN ${reservationRooms} ON dates.date >= ${reservationRooms.checkInDate} AND dates.date < ${reservationRooms.checkOutDate}
            LEFT JOIN ${reservations} ON ${reservationRooms.reservationId} = ${reservations.id}
            WHERE ${reservations.status} IN ('confirmed', 'checked-in') OR ${reservations.status} IS NULL
            GROUP BY dates.date
          ) as daily_occupied`
        );

      const result = await monthlyOccupiedQuery;
      const avgOccupiedRooms = result[0]?.avgOccupancy || 0;
      const occupancyRate = totalRooms > 0 ? (avgOccupiedRooms / totalRooms) * 100 : 0;

      monthlyOccupancy.push({
        month: monthStr,
        occupancyRate: Math.round(occupancyRate * 100) / 100
      });
    }

    const averageOccupancy = dailyOccupancy.length > 0 
      ? dailyOccupancy.reduce((sum, day) => sum + day.occupancyRate, 0) / dailyOccupancy.length 
      : 0;

    const peakOccupancyDays = dailyOccupancy
      .sort((a, b) => b.occupancyRate - a.occupancyRate)
      .slice(0, 5);

    return {
      dailyOccupancy,
      monthlyOccupancy,
      averageOccupancy: Math.round(averageOccupancy * 100) / 100,
      peakOccupancyDays
    };
  }

  async getGuestAnalytics(branchId?: number): Promise<{
    totalGuests: number;
    newGuestsThisMonth: number;
    returningGuests: number;
    guestGrowth: number;
    topGuests: Array<{ guest: Guest; totalBookings: number; totalSpent: number }>;
    guestsByNationality: Array<{ nationality: string; count: number }>;
  }> {
    let totalGuestsQuery = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(guests)
      .where(eq(guests.isActive, true));

    if (branchId) {
      totalGuestsQuery = totalGuestsQuery.where(eq(guests.branchId, branchId));
    }

    const [{ count: totalGuests }] = await totalGuestsQuery;

    // New guests this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    let newGuestsQuery = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(guests)
      .where(
        and(
          eq(guests.isActive, true),
          sql`${guests.createdAt} >= ${monthStart.toISOString()}`
        )
      );

    if (branchId) {
      newGuestsQuery = newGuestsQuery.where(eq(guests.branchId, branchId));
    }

    const [{ count: newGuestsThisMonth }] = await newGuestsQuery;

    // Returning guests (more than 1 reservation)
    let returningGuestsQuery = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(guests)
      .where(
        and(
          eq(guests.isActive, true),
          sql`${guests.reservationCount} > 1`
        )
      );

    if (branchId) {
      returningGuestsQuery = returningGuestsQuery.where(eq(guests.branchId, branchId));
    }

    const [{ count: returningGuests }] = await returningGuestsQuery;

    // Guest growth calculation
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);

    let lastMonthGuestsQuery = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(guests)
      .where(
        and(
          eq(guests.isActive, true),
          sql`${guests.createdAt} >= ${lastMonthStart.toISOString()}`,
          sql`${guests.createdAt} <= ${lastMonthEnd.toISOString()}`
        )
      );

    if (branchId) {
      lastMonthGuestsQuery = lastMonthGuestsQuery.where(eq(guests.branchId, branchId));
    }

    const [{ count: lastMonthGuests }] = await lastMonthGuestsQuery;
    const guestGrowth = lastMonthGuests > 0 
      ? ((newGuestsThisMonth - lastMonthGuests) / lastMonthGuests) * 100 
      : 0;

    // Top guests by bookings and spending
    let topGuestsQuery = this.db
      .select({
        guest: guests,
        totalBookings: sql<number>`COUNT(${reservations.id})`,
        totalSpent: sql<number>`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`
      })
      .from(guests)
      .leftJoin(reservations, eq(guests.id, reservations.guestId))
      .where(eq(guests.isActive, true))
      .groupBy(guests.id)
      .orderBy(sql`COUNT(${reservations.id}) DESC`)
      .limit(10);

    if (branchId) {
      topGuestsQuery = topGuestsQuery.where(eq(guests.branchId, branchId));
    }

    const topGuests = await topGuestsQuery;

    // Guests by nationality
    let nationalityQuery = this.db
      .select({
        nationality: guests.nationality,
        count: sql<number>`COUNT(*)`
      })
      .from(guests)
      .where(
        and(
          eq(guests.isActive, true),
          sql`${guests.nationality} IS NOT NULL`
        )
      )
      .groupBy(guests.nationality)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    if (branchId) {
      nationalityQuery = nationalityQuery.where(eq(guests.branchId, branchId));
    }

    const guestsByNationality = await nationalityQuery;

    return {
      totalGuests,
      newGuestsThisMonth,
      returningGuests,
      guestGrowth: Math.round(guestGrowth * 100) / 100,
      topGuests,
      guestsByNationality
    };
  }

  async getRoomPerformanceAnalytics(branchId?: number): Promise<{
    roomTypePerformance: Array<{
      roomType: RoomType;
      totalBookings: number;
      totalRevenue: number;
      averageRate: number;
      occupancyRate: number;
    }>;
    roomPerformance: Array<{
      room: Room & { roomType: RoomType };
      totalBookings: number;
      totalRevenue: number;
      occupancyRate: number;
      maintenanceRequests: number;
    }>;
  }> {
    // Room type performance
    let roomTypeQuery = this.db
      .select({
        roomType: roomTypes,
        totalBookings: sql<number>`COUNT(${reservationRooms.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${reservationRooms.totalAmount} AS DECIMAL)), 0)`,
        averageRate: sql<number>`COALESCE(AVG(CAST(${reservationRooms.ratePerNight} AS DECIMAL)), 0)`
      })
      .from(roomTypes)
      .leftJoin(rooms, eq(roomTypes.id, rooms.roomTypeId))
      .leftJoin(reservationRooms, eq(rooms.id, reservationRooms.roomId))
      .leftJoin(reservations, eq(reservationRooms.reservationId, reservations.id))
      .where(
        and(
          eq(roomTypes.isActive, true),
          or(
            sql`${reservations.status} IS NULL`,
            sql`${reservations.status} != 'cancelled'`
          )
        )
      )
      .groupBy(roomTypes.id);

    if (branchId) {
      roomTypeQuery = roomTypeQuery.where(eq(roomTypes.branchId, branchId));
    }

    const roomTypeStats = await roomTypeQuery;

    // Calculate occupancy rate for each room type
    const roomTypePerformance = await Promise.all(
      roomTypeStats.map(async (stat) => {
        // Get total rooms of this type
        let totalRoomsQuery = this.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(rooms)
          .where(
            and(
              eq(rooms.roomTypeId, stat.roomType.id),
              eq(rooms.isActive, true)
            )
          );

        if (branchId) {
          totalRoomsQuery = totalRoomsQuery.where(eq(rooms.branchId, branchId));
        }

        const [{ count: totalRooms }] = await totalRoomsQuery;

        // Calculate average occupancy for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let occupancyQuery = this.db
          .select({ 
            avgOccupied: sql<number>`AVG(daily_occupied.occupied_count)` 
          })
          .from(
            sql`(
              SELECT COUNT(DISTINCT ${reservationRooms.roomId}) as occupied_count
              FROM generate_series(${thirtyDaysAgo.toISOString()}::date, CURRENT_DATE, '1 day'::interval) dates
              LEFT JOIN ${reservationRooms} ON dates.date >= ${reservationRooms.checkInDate} 
                AND dates.date < ${reservationRooms.checkOutDate}
              LEFT JOIN ${rooms} ON ${reservationRooms.roomId} = ${rooms.id}
              LEFT JOIN ${reservations} ON ${reservationRooms.reservationId} = ${reservations.id}
              WHERE (${rooms.roomTypeId} = ${stat.roomType.id} OR ${rooms.roomTypeId} IS NULL)
                AND (${reservations.status} IN ('confirmed', 'checked-in') OR ${reservations.status} IS NULL)
              GROUP BY dates.date
            ) as daily_occupied`
          );

        const occupancyResult = await occupancyQuery;
        const avgOccupiedRooms = occupancyResult[0]?.avgOccupied || 0;
        const occupancyRate = totalRooms > 0 ? (avgOccupiedRooms / totalRooms) * 100 : 0;

        return {
          roomType: stat.roomType,
          totalBookings: stat.totalBookings,
          totalRevenue: stat.totalRevenue,
          averageRate: stat.averageRate,
          occupancyRate: Math.round(occupancyRate * 100) / 100
        };
      })
    );

    // Individual room performance
    let roomQuery = this.db
      .select({
        room: rooms,
        roomType: roomTypes,
        totalBookings: sql<number>`COUNT(${reservationRooms.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${reservationRooms.totalAmount} AS DECIMAL)), 0)`
      })
      .from(rooms)
      .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
      .leftJoin(reservationRooms, eq(rooms.id, reservationRooms.roomId))
      .leftJoin(reservations, eq(reservationRooms.reservationId, reservations.id))
      .where(
        and(
          eq(rooms.isActive, true),
          or(
            sql`${reservations.status} IS NULL`,
            sql`${reservations.status} != 'cancelled'`
          )
        )
      )
      .groupBy(rooms.id, roomTypes.id);

    if (branchId) {
      roomQuery = roomQuery.where(eq(rooms.branchId, branchId));
    }

    const roomStats = await roomQuery;

    const roomPerformance = roomStats.map((stat) => ({
      room: { ...stat.room, roomType: stat.roomType },
      totalBookings: stat.totalBookings,
      totalRevenue: stat.totalRevenue,
      occupancyRate: 0, // Would need complex calculation similar to room type
      maintenanceRequests: 0 // Would need maintenance tracking table
    }));

    return {
      roomTypePerformance,
      roomPerformance
    };
  }

  async getOperationalAnalytics(branchId?: number): Promise<{
    checkInTrends: Array<{ hour: number; count: number }>;
    checkOutTrends: Array<{ hour: number; count: number }>;
    averageStayDuration: number;
    cancellationRate: number;
    noShowRate: number;
    reservationsBySource: Array<{ source: string; count: number }>;
  }> {
    // Check-in trends by hour (using mock data for now since we don't have actual check-in times)
    const checkInTrends = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Math.floor(Math.random() * 10) + 1
    }));

    // Check-out trends by hour (using mock data for now)
    const checkOutTrends = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Math.floor(Math.random() * 8) + 1
    }));

    // Average stay duration
    let avgStayQuery = this.db
      .select({
        avgDuration: sql<number>`AVG(CAST(${reservationRooms.checkOutDate} AS DATE) - CAST(${reservationRooms.checkInDate} AS DATE))`
      })
      .from(reservationRooms)
      .innerJoin(reservations, eq(reservationRooms.reservationId, reservations.id))
      .where(sql`${reservations.status} != 'cancelled'`);

    if (branchId) {
      avgStayQuery = avgStayQuery.where(eq(reservations.branchId, branchId));
    }

    const avgStayResult = await avgStayQuery;
    const averageStayDuration = avgStayResult[0]?.avgDuration || 2;

    // Cancellation and no-show rates
    let statusStatsQuery = this.db
      .select({
        status: reservations.status,
        count: sql<number>`COUNT(*)`
      })
      .from(reservations)
      .groupBy(reservations.status);

    if (branchId) {
      statusStatsQuery = statusStatsQuery.where(eq(reservations.branchId, branchId));
    }

    const statusStats = await statusStatsQuery;
    const totalReservations = statusStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
    const cancelledCount = statusStats.find((s: any) => s.status === 'cancelled')?.count || 0;
    const noShowCount = statusStats.find((s: any) => s.status === 'no-show')?.count || 0;

    const cancellationRate = totalReservations > 0 ? (cancelledCount / totalReservations) * 100 : 0;
    const noShowRate = totalReservations > 0 ? (noShowCount / totalReservations) * 100 : 0;

    // Reservations by source (placeholder - would need source tracking)
    const reservationsBySource = [
      { source: 'Direct', count: Math.floor(totalReservations * 0.4) },
      { source: 'Online', count: Math.floor(totalReservations * 0.3) },
      { source: 'Phone', count: Math.floor(totalReservations * 0.2) },
      { source: 'Walk-in', count: Math.floor(totalReservations * 0.1) }
    ];

    return {
      checkInTrends,
      checkOutTrends,
      averageStayDuration: Math.round((averageStayDuration || 0) * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      reservationsBySource
    };
  }

  // Payment operations
  async getPayments(reservationId: string): Promise<Payment[]> {
    return this.db.select().from(payments).where(eq(payments.reservationId, reservationId)).orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await this.db.insert(payments).values(payment).returning();
    
    // Update reservation paid amount
    const existingPayments = await this.getPayments(payment.reservationId);
    const totalPaid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) + parseFloat(payment.amount);
    
    await this.db
      .update(reservations)
      .set({ paidAmount: totalPaid.toString() })
      .where(eq(reservations.id, payment.reservationId));
    
    return newPayment;
  }

  async getPaymentsByReservation(reservationId: string): Promise<Payment[]> {
    return this.getPayments(reservationId);
  }

  async updatePaymentStatus(paymentId: number, status: string): Promise<Payment> {
    const [updatedPayment] = await this.db
      .update(payments)
      .set({ status: status as any })
      .where(eq(payments.id, paymentId))
      .returning();
    return updatedPayment;
  }

  async getReservationWithPayments(id: string): Promise<(Reservation & { 
    guest: Guest; 
    reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[];
    payments: Payment[];
  }) | undefined> {
    const reservation = await this.db.query.reservations.findFirst({
      where: eq(reservations.id, id),
      with: {
        guest: true,
        reservationRooms: {
          with: {
            room: {
              with: {
                roomType: true
              }
            }
          }
        },
        payments: {
          orderBy: desc(payments.paymentDate)
        }
      }
    });
    
    return reservation as any;
  }
}

export const storage = new DatabaseStorage();