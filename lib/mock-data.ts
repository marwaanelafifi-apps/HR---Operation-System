export const employees = [
  { id: "sofia-bennett", name: "Sofia Bennett", role: "Operations Lead", department: "Operations", status: "Active", email: "sofia.bennett@opshub.demo", location: "Cairo HQ", joined: "Mar 2022" },
  { id: "marcus-johnson", name: "Marcus Johnson", role: "Field Agent", department: "Customer Success", status: "In field", email: "marcus.johnson@opshub.demo", location: "Nasr City", joined: "Aug 2023" },
  { id: "nour-adel", name: "Nour Adel", role: "People Partner", department: "People", status: "Active", email: "nour.adel@opshub.demo", location: "Cairo HQ", joined: "Jan 2024" },
  { id: "adam-khalil", name: "Adam Khalil", role: "Account Executive", department: "Sales", status: "Away", email: "adam.khalil@opshub.demo", location: "Maadi", joined: "Nov 2023" },
  { id: "layla-hassan", name: "Layla Hassan", role: "Finance Analyst", department: "Finance", status: "Active", email: "layla.hassan@opshub.demo", location: "Cairo HQ", joined: "Jun 2022" },
];

export const customers = [
  { id: "acme-studios", name: "Acme Studios", contact: "Sarah Coleman", segment: "Enterprise", stage: "Proposal", value: "$48,000", next: "Today, 2:30 PM" },
  { id: "northstar-labs", name: "Northstar Labs", contact: "Omar El-Sayed", segment: "Growth", stage: "Qualified", value: "$18,500", next: "Tomorrow, 10:00 AM" },
  { id: "terrain-co", name: "Terrain Co.", contact: "Maya Chen", segment: "Enterprise", stage: "Negotiation", value: "$64,000", next: "Nov 18, 9:00 AM" },
  { id: "orbit-market", name: "Orbit Market", contact: "James Hart", segment: "SMB", stage: "Discovery", value: "$9,600", next: "Nov 19, 1:00 PM" },
];

export const meetings = [
  { id: "m-1042", title: "Growth planning session", customer: "Acme Studios", agent: "Marcus Johnson", time: "Today · 2:30 PM", duration: "60 min", status: "Confirmed", location: "Zamalek, Cairo" },
  { id: "m-1043", title: "Product discovery", customer: "Northstar Labs", agent: "Adam Khalil", time: "Tomorrow · 10:00 AM", duration: "45 min", status: "Scheduled", location: "New Cairo" },
  { id: "m-1044", title: "Contract review", customer: "Terrain Co.", agent: "Marcus Johnson", time: "Nov 18 · 9:00 AM", duration: "60 min", status: "Scheduled", location: "Maadi" },
];

export const activity = [
  ["Marcus Johnson", "submitted a meeting arrival check-in", "8 min ago"],
  ["Nour Adel", "approved Sofia Bennett’s leave request", "36 min ago"],
  ["Sarah Coleman", "completed the Acme pre-meeting form", "1 hr ago"],
  ["Adam Khalil", "moved Orbit Market to Discovery", "2 hrs ago"],
] as const;
