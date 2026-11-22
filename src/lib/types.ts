// Domain types. They mirror the tables planned for the PostgreSQL schema so the
// demo store can be swapped for real API calls without touching the screens.

export type Role = 'organizer' | 'co_organizer' | 'participant';
export type Category = 'School' | 'College' | 'Corporate' | 'Friends' | 'Family' | 'Alumni';
export type Availability = 'yes' | 'maybe' | 'no';
export type FoodPref = 'Vegetarian' | 'Non-vegetarian' | 'Vegan' | 'Jain';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type BudgetKey = 'venue' | 'food' | 'transport' | 'stay' | 'deco' | 'photo' | 'fun' | 'misc';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
}

export interface Person {
  id: string;
  name: string;
  city: string;
  role: Role;
  attendance: Availability | null;
  status: 'active' | 'pending';
  note?: string;
  checkedIn?: boolean;
}

export interface DateOption {
  id: string;
  iso: string; // yyyy-mm-dd
  slot: string; // e.g. "Evening"
  others: { yes: number; maybe: number; no: number };
}

export interface Venue {
  id: string;
  name: string;
  kind: 'Resort' | 'Hotel' | 'Restaurant' | 'Banquet hall' | 'Beachside' | 'Farmhouse';
  area: string;
  capacity: number;
  tags: string[];
  photoId: string;
  verification: 'Verified vendor' | 'Google Places' | 'Unverified';
  othersVotes: number;
  suggestedBy?: string;
}

export interface Task {
  id: string;
  title: string;
  desc: string;
  assignee: string | null; // person name, null = open for volunteers
  due: string;
  status: TaskStatus;
  comments: number;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  method: 'UPI' | 'Card' | 'Net banking';
  at: string;
  status: 'verified' | 'awaiting' | 'refunded';
}

export interface Announcement {
  id: string;
  author: string;
  at: string;
  title: string;
  body: string;
}

export interface Reunion {
  id: string;
  code: string; // human-readable reunion ID
  inviteToken: string;
  name: string;
  category: Category;
  institution: string;
  batch: string;
  city: string;
  description: string;
  expected: number;
  dateFrom: string;
  dateTo: string;
  budgetPerPerson: number;
  coverPhotoId: string;
  myRole: Role;
  myAttendance: Availability | null;
  requireApproval: boolean;
  status: 'planning' | 'confirmed' | 'completed';
  people: Person[];
  dates: DateOption[];
  myDateVotes: Record<string, Availability>;
  finalDateId: string | null;
  votingDeadline: string;
  venues: Venue[];
  myVenueVote: string | null;
  finalVenueId: string | null;
  budget: Record<BudgetKey, number>;
  payers: number;
  spent: number;
  myFood: FoodPref | null;
  myDiet: string;
  foodCounts: Record<FoodPref, number>;
  tasks: Task[];
  payments: Payment[];
  contribution: number;
  myPaymentStatus: 'due' | 'verifying' | 'paid';
  announcements: Announcement[];
  checkedIn: number;
}

export interface Invitation {
  reunionId: string;
  token: string;
  name: string;
  invitedBy: string;
  members: number;
  coverPhotoId: string;
  category: Category;
  city: string;
  description: string;
}
