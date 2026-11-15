// B Investment — For Real Estate, 6th of October, Egypt
// All data is synthetic demo data only.

export const employees = [
  { id: "karim-mansour", name: "Karim Mansour", role: "CEO", department: "Executive", status: "Active", email: "karim.mansour@binvestment.demo", location: "6th of October HQ", joined: "Jan 2021" },
  { id: "sara-el-sayed", name: "Sara El-Sayed", role: "CEO", department: "Executive", status: "Active", email: "sara.elsayed@binvestment.demo", location: "6th of October HQ", joined: "Jan 2021" },
  { id: "layla-hassan", name: "Layla Hassan", role: "Finance Analyst", department: "Finance", status: "Active", email: "layla.hassan@binvestment.demo", location: "6th of October HQ", joined: "Mar 2022" },
  { id: "omar-nasser", name: "Omar Nasser", role: "Sales Manager", department: "Sales", status: "Active", email: "omar.nasser@binvestment.demo", location: "6th of October HQ", joined: "Jun 2022" },
  { id: "hana-ibrahim", name: "Hana Ibrahim", role: "Sales Manager", department: "Sales", status: "Active", email: "hana.ibrahim@binvestment.demo", location: "6th of October HQ", joined: "Sep 2022" },
  { id: "ahmed-khalil", name: "Ahmed Khalil", role: "Broker", department: "Sales", status: "In field", email: "ahmed.khalil@binvestment.demo", location: "New Capital", joined: "Jan 2023" },
  { id: "nour-adel", name: "Nour Adel", role: "Broker", department: "Sales", status: "Active", email: "nour.adel@binvestment.demo", location: "6th of October HQ", joined: "Mar 2023" },
  { id: "mostafa-raed", name: "Mostafa Raed", role: "Broker", department: "Sales", status: "Active", email: "mostafa.raed@binvestment.demo", location: "6th of October HQ", joined: "Apr 2023" },
  { id: "maya-ali", name: "Maya Ali", role: "Broker", department: "Sales", status: "Away", email: "maya.ali@binvestment.demo", location: "Fifth Settlement", joined: "Jul 2023" },
  { id: "ibrahim-fouad", name: "Ibrahim Fouad", role: "Broker", department: "Sales", status: "Active", email: "ibrahim.fouad@binvestment.demo", location: "6th of October HQ", joined: "Aug 2023" },
  { id: "dina-farouk", name: "Dina Farouk", role: "Broker", department: "Sales", status: "Active", email: "dina.farouk@binvestment.demo", location: "6th of October HQ", joined: "Oct 2023" },
  { id: "youssef-tarek", name: "Youssef Tarek", role: "Operations Admin", department: "Operations", status: "Active", email: "youssef.tarek@binvestment.demo", location: "6th of October HQ", joined: "Feb 2022" },
  { id: "rania-maged", name: "Rania Maged", role: "Operations Admin", department: "Operations", status: "Active", email: "rania.maged@binvestment.demo", location: "6th of October HQ", joined: "May 2022" },
  { id: "adam-wael", name: "Adam Wael", role: "Marketeer", department: "Marketing", status: "Active", email: "adam.wael@binvestment.demo", location: "Remote", joined: "Nov 2023" },
  { id: "lina-samy", name: "Lina Samy", role: "Marketeer", department: "Marketing", status: "Active", email: "lina.samy@binvestment.demo", location: "Remote", joined: "Nov 2023" },
];

export const zones = [
  { id: "z-1", name: "New Capital", active: true },
  { id: "z-2", name: "Fifth Settlement", active: true },
  { id: "z-3", name: "6th of October", active: true },
  { id: "z-4", name: "Mostakbal City", active: true },
  { id: "z-5", name: "October", active: true },
];

export const outsideMeetingRequests = [
  {
    id: "omr-001",
    employeeName: "Ahmed Khalil",
    employeeRole: "Broker",
    clientName: "Mohammed Al-Rashidy",
    clientNumber: "+20 101 234 5678",
    date: "2026-11-16",
    time: "10:00",
    zone: "New Capital",
    projectName: "Midtown East Tower",
    meetingLocation: "Plot 23, Administrative District, New Capital",
    notes: "Client is interested in Units 4A and 5B. Expecting to close this week.",
    status: "pending" as const,
    submittedAt: "2026-11-15 09:14 AM",
  },
  {
    id: "omr-002",
    employeeName: "Maya Ali",
    employeeRole: "Broker",
    clientName: "Fatima Nour",
    clientNumber: "+20 112 876 5432",
    date: "2026-11-17",
    time: "14:00",
    zone: "Fifth Settlement",
    projectName: "Gardenia Heights",
    meetingLocation: "90th Street, Fifth Settlement, Cairo",
    notes: "",
    status: "approved" as const,
    submittedAt: "2026-11-15 11:30 AM",
  },
  {
    id: "omr-003",
    employeeName: "Nour Adel",
    employeeRole: "Broker",
    clientName: "Tarek Hussain",
    clientNumber: "+20 100 555 9900",
    date: "2026-11-14",
    time: "11:00",
    zone: "Mostakbal City",
    projectName: "Palm Hills Compound",
    meetingLocation: "Palm Hills Sales Centre, Mostakbal City",
    notes: "Second visit — client ready to sign.",
    status: "approved" as const,
    submittedAt: "2026-11-13 08:00 AM",
  },
];

export const excuseRequests = [
  {
    id: "exc-001",
    employeeName: "Ahmed Khalil",
    date: "2026-11-10",
    slot: "Morning" as const,
    reason: "Doctor appointment — will arrive by 12:30 PM.",
    status: "approved" as const,
    submittedAt: "2026-11-09 06:00 PM",
    hoursUsed: 1,
  },
  {
    id: "exc-002",
    employeeName: "Ahmed Khalil",
    date: "2026-11-05",
    slot: "Evening" as const,
    reason: "Family emergency — need to leave at 6:00 PM.",
    status: "approved" as const,
    submittedAt: "2026-11-05 10:00 AM",
    hoursUsed: 1,
  },
  {
    id: "exc-003",
    employeeName: "Nour Adel",
    date: "2026-11-12",
    slot: "Morning" as const,
    reason: "Traffic — car breakdown on Ring Road.",
    status: "pending" as const,
    submittedAt: "2026-11-12 08:45 AM",
    hoursUsed: 1,
  },
];

// Attendance unlock overrides (admin-managed)
export const attendanceUnlocks = [
  { employeeId: "ahmed-khalil", employeeName: "Ahmed Khalil", unlocked: false, reason: "", updatedAt: "" },
  { employeeId: "nour-adel", employeeName: "Nour Adel", unlocked: false, reason: "", updatedAt: "" },
  { employeeId: "mostafa-raed", employeeName: "Mostafa Raed", unlocked: false, reason: "", updatedAt: "" },
  { employeeId: "maya-ali", employeeName: "Maya Ali", unlocked: true, reason: "Temporary — remote project site Nov 14–16", updatedAt: "Nov 14" },
  { employeeId: "omar-nasser", employeeName: "Omar Nasser", unlocked: false, reason: "", updatedAt: "" },
];

export const meetings = [
  { id: "m-1042", title: "Unit viewing — Midtown East Tower", customer: "Mohammed Al-Rashidy", agent: "Ahmed Khalil", time: "Today · 10:00 AM", duration: "60 min", status: "Confirmed", location: "New Capital" },
  { id: "m-1043", title: "Second visit — Gardenia Heights", customer: "Fatima Nour", agent: "Maya Ali", time: "Tomorrow · 2:00 PM", duration: "90 min", status: "Scheduled", location: "Fifth Settlement" },
  { id: "m-1044", title: "Contract signing — Palm Hills", customer: "Tarek Hussain", agent: "Nour Adel", time: "Nov 17 · 11:00 AM", duration: "60 min", status: "Scheduled", location: "Mostakbal City" },
];

export const activity = [
  ["Ahmed Khalil", "submitted an outside meeting request for New Capital", "9 min ago"],
  ["Maya Ali", "had outside meeting request approved by Sara El-Sayed", "1 hr ago"],
  ["Nour Adel", "submitted an excuse request (morning slot)", "2 hrs ago"],
  ["Omar Nasser", "checked in at 6th of October HQ", "3 hrs ago"],
] as const;

export const customers = [
  { id: "al-rashidy", name: "Mohammed Al-Rashidy", contact: "Mohamed Al-Rashidy", segment: "High Net Worth", stage: "Negotiation", value: "EGP 4,200,000", next: "Today, 10:00 AM" },
  { id: "fatima-nour", name: "Fatima Nour", contact: "Fatima Nour", segment: "Individual", stage: "Proposal", value: "EGP 2,800,000", next: "Tomorrow, 2:00 PM" },
  { id: "tarek-hussain", name: "Tarek Hussain", contact: "Tarek Hussain", segment: "Investor", stage: "Closing", value: "EGP 6,500,000", next: "Nov 17, 11:00 AM" },
  { id: "amira-fahmy", name: "Amira Fahmy", contact: "Amira Fahmy", segment: "Individual", stage: "Discovery", value: "EGP 1,900,000", next: "Nov 20, 3:00 PM" },
];
