// Builds the Reunion object the front end expects (src/lib/types.ts) from the
// database, as seen by one user. Must run inside withUser(): RLS limits every
// tenant query to reunions that user belongs to.

const BUDGET_KEYS = ['venue', 'food', 'transport', 'stay', 'deco', 'photo', 'fun', 'misc'];
const FOOD = ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Jain'];

export async function serializeReunion(c, reunionId, me) {
  const { rows: [r] } = await c.query('SELECT * FROM reunions WHERE id = $1', [reunionId]);
  if (!r) return null;
  const { rows: members } = await c.query(
    `SELECT m.*, u.name, u.city AS user_city FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.reunion_id = $1 ORDER BY (m.role = 'organizer') DESC, (m.role = 'co_organizer') DESC, u.name`, [reunionId]);
  const mine = members.find((m) => m.user_id === me && m.status === 'active');
  if (!mine) return null;
  const isOrganizer = mine.role !== 'participant';

  const [dates, dvotes, venues, vvotes, budget, tasks, ann, pays] = await Promise.all([
    c.query('SELECT id, day, slot FROM date_options WHERE reunion_id = $1 ORDER BY day, slot', [reunionId]),
    c.query('SELECT date_option_id, user_id, availability FROM date_votes WHERE reunion_id = $1', [reunionId]),
    c.query('SELECT v.*, u.name AS suggested_name FROM venues v LEFT JOIN users u ON u.id = v.suggested_by WHERE v.reunion_id = $1 ORDER BY v.created_at', [reunionId]),
    c.query('SELECT user_id, venue_id FROM venue_votes WHERE reunion_id = $1', [reunionId]),
    c.query('SELECT key, amount FROM budget_items WHERE reunion_id = $1', [reunionId]),
    c.query(`SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE t.reunion_id = $1 ORDER BY t.created_at`, [reunionId]),
    c.query(`SELECT a.*, u.name AS author_name FROM announcements a LEFT JOIN users u ON u.id = a.author_id WHERE a.reunion_id = $1 ORDER BY a.created_at DESC LIMIT 20`, [reunionId]),
    c.query(`SELECT p.*, u.name FROM payments p JOIN users u ON u.id = p.user_id WHERE p.reunion_id = $1 ${isOrganizer ? '' : 'AND p.user_id = $2'} ORDER BY p.created_at DESC LIMIT 50`, isOrganizer ? [reunionId] : [reunionId, me])
  ]);

  const others = members.filter((m) => m.user_id !== me);
  const active = members.filter((m) => m.status === 'active');
  const budgetMap = Object.fromEntries(BUDGET_KEYS.map((k) => [k, 0]));
  for (const b of budget.rows) budgetMap[b.key] = b.amount;
  const foodCounts = Object.fromEntries(FOOD.map((f) => [f, 0]));
  for (const m of active) if (m.user_id !== me && m.food_pref) foodCounts[m.food_pref]++;
  const myPaid = pays.rows.some((p) => p.user_id === me && p.status === 'verified');

  return {
    id: r.id,
    code: r.code,
    inviteToken: isOrganizer ? r.invite_token : '',
    name: r.name,
    category: r.category,
    institution: r.institution,
    batch: r.batch,
    city: r.city_name,
    description: r.description,
    expected: r.expected,
    dateFrom: r.date_from ?? '',
    dateTo: r.date_to ?? '',
    budgetPerPerson: r.budget_per_person,
    coverPhotoId: r.cover_photo_id,
    myRole: mine.role,
    myAttendance: mine.attendance,
    requireApproval: r.require_approval,
    status: r.status,
    people: others
      .filter((m) => m.status === 'active' || isOrganizer)
      .map((m) => ({ id: m.user_id, name: m.name, city: m.user_city ?? '', role: m.role, attendance: m.attendance, status: m.status, note: m.note ?? undefined, checkedIn: Boolean(m.checked_in_at) })),
    dates: dates.rows.map((d) => {
      const others = { yes: 0, maybe: 0, no: 0 };
      for (const v of dvotes.rows) if (v.date_option_id === d.id && v.user_id !== me) others[v.availability]++;
      return { id: d.id, iso: d.day, slot: d.slot, others };
    }),
    myDateVotes: Object.fromEntries(dvotes.rows.filter((v) => v.user_id === me).map((v) => [v.date_option_id, v.availability])),
    finalDateId: r.final_date_id,
    votingDeadline: r.voting_deadline ?? '',
    venues: venues.rows.map((v) => ({
      id: v.id, name: v.name, kind: v.kind, area: v.area, capacity: v.capacity, tags: v.tags, photoId: v.photo_id, verification: v.verification,
      othersVotes: vvotes.rows.filter((x) => x.venue_id === v.id && x.user_id !== me).length,
      suggestedBy: v.suggested_by ? (v.suggested_by === me ? 'You' : v.suggested_name) : undefined
    })),
    myVenueVote: vvotes.rows.find((x) => x.user_id === me)?.venue_id ?? null,
    finalVenueId: r.final_venue_id,
    budget: budgetMap,
    payers: r.payers,
    spent: r.spent,
    myFood: mine.food_pref,
    myDiet: mine.diet,
    foodCounts,
    tasks: tasks.rows.map((t) => ({
      id: t.id, title: t.title, desc: t.description, due: t.due ?? '', status: t.status, comments: 0,
      assignee: t.assignee_id ? (t.assignee_id === me ? 'You' : t.assignee_name) : null
    })),
    payments: pays.rows.map((p) => ({
      id: p.id, name: p.user_id === me ? 'You' : p.name, amount: p.amount, method: p.method ?? 'UPI', at: p.created_at.toISOString(),
      status: p.status === 'verified' ? 'verified' : p.status === 'refunded' ? 'refunded' : 'awaiting'
    })),
    contribution: r.contribution,
    myPaymentStatus: myPaid ? 'paid' : 'due',
    announcements: ann.rows.map((a) => ({ id: a.id, author: a.author_id === me ? 'You' : a.author_name ?? 'Organizer', at: a.created_at.toISOString(), title: a.title, body: a.body })),
    checkedIn: members.filter((m) => m.checked_in_at).length
  };
}
