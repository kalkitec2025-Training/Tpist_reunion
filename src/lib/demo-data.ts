// Sample data for DEMO MODE only. People and reunions are invented; venues and
// caterers are placeholders, never real businesses. Replace with API data.
import type { DateOption, Person, Reunion, Venue, Invitation, Category } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);
export const token = () => Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 56)]).join('');

const people: Person[] = [
  { id: 'p1', name: 'Priya Sharma', city: 'Visakhapatnam', role: 'co_organizer', attendance: 'yes', status: 'active' },
  { id: 'p2', name: 'Anil Kumar', city: 'Bengaluru', role: 'participant', attendance: 'maybe', status: 'active' },
  { id: 'p3', name: 'Meena Reddy', city: 'Visakhapatnam', role: 'participant', attendance: 'yes', status: 'active' },
  { id: 'p4', name: 'Sameer Khan', city: 'Dubai', role: 'participant', attendance: 'no', status: 'active' },
  { id: 'p5', name: 'Lakshmi P.', city: 'Chennai', role: 'participant', attendance: 'yes', status: 'active' },
  { id: 'p6', name: 'Kiran Varma', city: 'Visakhapatnam', role: 'participant', attendance: null, status: 'active' },
  { id: 'p7', name: 'Farah S.', city: 'Hyderabad', role: 'participant', attendance: 'yes', status: 'active' },
  { id: 'p8', name: 'Suresh Babu', city: 'Vijayawada', role: 'participant', attendance: null, status: 'pending', note: '10th A, sat behind the organizer' },
  { id: 'p9', name: 'Divya N.', city: 'Pune', role: 'participant', attendance: null, status: 'pending', note: 'Science club, 2005 batch' },
  { id: 'p10', name: 'Harsha V.', city: 'Visakhapatnam', role: 'participant', attendance: null, status: 'pending' }
];

const dates: DateOption[] = [
  { id: 'd1', iso: '2026-12-20', slot: 'Saturday evening', others: { yes: 24, maybe: 6, no: 4 } },
  { id: 'd2', iso: '2026-12-28', slot: 'Sunday lunch', others: { yes: 19, maybe: 8, no: 7 } },
  { id: 'd3', iso: '2027-01-03', slot: 'Saturday evening', others: { yes: 11, maybe: 9, no: 14 } },
  { id: 'd4', iso: '2027-01-11', slot: 'Sunday, full day', others: { yes: 6, maybe: 5, no: 23 } }
];

export const demoVenues = (): Venue[] => [
  { id: 'v1', name: 'Demo Venue A — Beachside Resort', kind: 'Resort', area: 'Rushikonda', capacity: 150, tags: ['Food on-site', 'Parking', 'Rooms', 'Sea view'], photoId: 'resortPool', verification: 'Verified vendor', othersVotes: 13 },
  { id: 'v2', name: 'Demo Venue B — Banquet Hall', kind: 'Banquet hall', area: 'Beach Road', capacity: 300, tags: ['In-house catering', 'Parking', 'AC hall'], photoId: 'dinnerTable', verification: 'Google Places', othersVotes: 9 },
  { id: 'v3', name: 'Demo Venue C — Hotel Poolside', kind: 'Hotel', area: 'Siripuram', capacity: 120, tags: ['Poolside lawn', 'Rooms', 'Bar'], photoId: 'hotelPool', verification: 'Unverified', othersVotes: 4 },
  { id: 'v4', name: 'Demo Venue D — Beach Lawn', kind: 'Beachside', area: 'Yarada', capacity: 200, tags: ['Open air', 'Sunset view', 'Outside caterer allowed'], photoId: 'vizagWaves', verification: 'Unverified', othersVotes: 2 },
  { id: 'v5', name: 'Demo Venue E — Old Campus Hall', kind: 'Banquet hall', area: 'Waltair', capacity: 250, tags: ['Nostalgia', 'Stage', 'Parking'], photoId: 'lectureHall', verification: 'Unverified', othersVotes: 1 }
];

export function makeReunion(input: {
  name: string; category: Category; institution: string; batch: string; city: string; description: string;
  expected: number; dateFrom: string; dateTo: string; budgetPerPerson: number; coverPhotoId: string;
}, seeded = false): Reunion {
  const id = uid();
  const known: Record<string, string> = { visakhapatnam: 'VSKP', vizag: 'VSKP', vijayawada: 'VJA', hyderabad: 'HYD', bengaluru: 'BLR', chennai: 'MAA' };
  const prefix = known[input.city.trim().toLowerCase()] ?? (input.city.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'CITY');
  return {
    id,
    code: `B2C-${prefix}-${(input.batch || '0000').slice(-4)}-${id.slice(0, 4).toUpperCase()}`,
    inviteToken: token(),
    ...input,
    myRole: 'organizer',
    myAttendance: seeded ? 'yes' : null,
    requireApproval: true,
    status: 'planning',
    people: seeded ? people : [],
    dates: seeded ? dates : [],
    myDateVotes: seeded ? { d1: 'yes', d3: 'no' } : {},
    finalDateId: null,
    votingDeadline: '2026-11-25',
    venues: seeded ? demoVenues() : [],
    myVenueVote: seeded ? 'v1' : null,
    finalVenueId: null,
    budget: seeded
      ? { venue: 20000, food: 32000, transport: 6000, stay: 0, deco: 4500, photo: 6500, fun: 4000, misc: 2200 }
      : { venue: 0, food: 0, transport: 0, stay: 0, deco: 0, photo: 0, fun: 0, misc: 0 },
    payers: seeded ? 32 : Math.max(1, Math.round(input.expected * 0.6)),
    spent: seeded ? 24500 : 0,
    myFood: seeded ? 'Non-vegetarian' : null,
    myDiet: '',
    foodCounts: seeded ? { Vegetarian: 14, 'Non-vegetarian': 15, Vegan: 3, Jain: 3 } : { Vegetarian: 0, 'Non-vegetarian': 0, Vegan: 0, Jain: 0 },
    tasks: seeded
      ? [
          { id: 't1', title: 'Venue booking', desc: 'Confirm the hall, advance payment and timing with the venue.', assignee: 'You', due: '2026-12-05', status: 'In Progress', comments: 4 },
          { id: 't2', title: 'Food arrangements', desc: 'Finalise the caterer from the shortlisted packages.', assignee: 'Priya Sharma', due: '2026-12-08', status: 'Not Started', comments: 2 },
          { id: 't3', title: 'Payment collection', desc: 'Share the contribution request and follow up on pending payments.', assignee: 'Meena Reddy', due: '2026-12-10', status: 'In Progress', comments: 7 },
          { id: 't4', title: 'Invite teachers', desc: 'Reach out to class teachers and the principal.', assignee: 'Anil Kumar', due: '2026-11-28', status: 'Completed', comments: 3 },
          { id: 't5', title: 'Photography & highlight reel', desc: "Coordinate the photographer and collect everyone's phone photos after the event.", assignee: null, due: '2026-12-18', status: 'Not Started', comments: 0 }
        ]
      : [],
    payments: seeded
      ? [
          { id: 'pay1', name: 'Priya Sharma', amount: 2350, method: 'UPI', at: '2026-11-21T19:42:00', status: 'verified' },
          { id: 'pay2', name: 'Anil Kumar', amount: 2350, method: 'Card', at: '2026-11-21T13:10:00', status: 'awaiting' },
          { id: 'pay3', name: 'Lakshmi P.', amount: 2350, method: 'UPI', at: '2026-11-20T10:05:00', status: 'verified' },
          { id: 'pay4', name: 'Sameer Khan', amount: 2350, method: 'UPI', at: '2026-11-19T09:30:00', status: 'refunded' }
        ]
      : [],
    contribution: seeded ? 2350 : input.budgetPerPerson,
    myPaymentStatus: 'due',
    announcements: seeded
      ? [{ id: 'a1', author: 'You', at: '2026-11-22T10:00:00', title: 'Vote on dates before Wednesday!', body: "We'll lock the date and start booking the venue right after." }]
      : [],
    checkedIn: 18
  };
}

export function seedReunions(): Reunion[] {
  const a = makeReunion({
    name: "Vizag St. Mary's School Batch 2005 Reunion", category: 'School', institution: "St. Mary's School", batch: '2005',
    city: 'Visakhapatnam', description: "20 years since we left school. Let's meet again — help pick the date and venue!",
    expected: 80, dateFrom: '2026-12-19', dateTo: '2027-01-10', budgetPerPerson: 2500, coverPhotoId: 'kidsHug'
  }, true);
  const b = makeReunion({
    name: 'AU Engineering ECE 2010 – 15 Years', category: 'College', institution: 'Andhra University College of Engineering', batch: '2010',
    city: 'Visakhapatnam', description: 'Fifteen years since graduation. Families welcome.',
    expected: 60, dateFrom: '2027-01-18', dateTo: '2027-01-18', budgetPerPerson: 3000, coverPhotoId: 'graduates'
  }, true);
  b.myRole = 'participant';
  b.status = 'confirmed';
  b.finalDateId = 'd1';
  b.finalVenueId = 'v1';
  b.contribution = 2400;
  return [a, b];
}

export const seedInvitations = (): Invitation[] => [
  {
    reunionId: 'inv-office-2015', token: 'OfficeGang15', name: 'Office Gang 2015 – Friends Reunion', invitedBy: 'Sneha K.', members: 12,
    coverPhotoId: 'friendsSelfie', category: 'Friends', city: 'Visakhapatnam', description: 'Our old team from the 2015 project floor. One evening, good food, old stories.'
  }
];
