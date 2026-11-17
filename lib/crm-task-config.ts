// CRM task configuration — stored in localStorage, editable by admin.
// Controls which tasks are active, how many links Ads requires,
// which Knowledge fields are shown, and any custom tasks.

export type AssessmentFieldKey =
  | "projectName" | "companyName" | "previousWork" | "location"
  | "projectArea" | "projectDetails" | "unitTypes" | "pricesAndAcres"
  | "paymentPlan" | "finishingType" | "construction" | "deliveryDate"
  | "maintenance" | "investorType" | "managementAndOperations"
  | "termsOfContract" | "sellingPoints" | "weaknessPoints" | "additionalNotes"
  | "owner";

export interface KnowledgeFieldConfig {
  key: AssessmentFieldKey;
  labelEn: string;
  labelAr: string;
  enabled: boolean;
  required?: boolean;
  fieldType?: "text" | "date" | "dropdown" | "textarea";
  options?: string[];
  layout?: "full" | "right"; // full = spans both columns, right = starts at col 2
}

export type Recurrence = "once" | "daily" | "weekly" | "monthly";

export interface TaskLink {
  id: string;
  label: string;
  url: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string; // base64 data URL — prototype only, no server
}

export interface CustomTask {
  id: string;
  labelEn: string;
  labelAr: string;
  description: string;
  enabled: boolean;
  startDate: string;    // ISO YYYY-MM-DD — the first (or only) day this task applies
  recurrence: Recurrence;
  dueTime?: string;     // HH:MM 24-hour, optional deadline shown on the task
  lockMode?: boolean;   // when true: fullscreen integrity lock — user cannot switch tabs during completion
  allowVoice?: boolean; // when true: user can submit via voice note instead of typed text
  links?: TaskLink[];
  attachments?: TaskAttachment[];
}

/** Returns true if a custom task should appear on the given ISO date. */
export function customTaskAppliesToDate(task: CustomTask, date: string): boolean {
  if (!task.enabled || !task.startDate || date < task.startDate) return false;
  if (task.recurrence === "once")    return date === task.startDate;
  if (task.recurrence === "daily")   return true;
  const start = new Date(`${task.startDate}T00:00`);
  const target = new Date(`${date}T00:00`);
  if (task.recurrence === "weekly")  return start.getDay() === target.getDay();
  if (task.recurrence === "monthly") return start.getDate() === target.getDate();
  return false;
}

export interface CRMTasksConfig {
  ads: { enabled: boolean; linkCount: number };
  knowledge: { enabled: boolean; fields: KnowledgeFieldConfig[] };
  calls: { enabled: boolean };
  rotation: { enabled: boolean };
  customTasks: CustomTask[];
  requestsTarget: number;   // daily client requests target
  meetingsTarget: number;   // daily meetings target
  knowledgeTarget: number;  // daily knowledge assessments target
}

const DEFAULT_FIELDS: KnowledgeFieldConfig[] = [
  { key: "projectName",            labelEn: "Project Name",                       labelAr: "اسم المشروع",               enabled: true,  required: true },
  { key: "companyName",            labelEn: "Company Name",                       labelAr: "اسم الشركة",                enabled: true,  required: true },
  { key: "previousWork",           labelEn: "Previous Projects or Owner History", labelAr: "سابقة الأعمال أو تاريخ المالك", enabled: true, required: true,  fieldType: "textarea" },
  { key: "location",               labelEn: "Location",                           labelAr: "الموقع",                    enabled: true,  required: true,  fieldType: "textarea" },
  { key: "projectArea",            labelEn: "Project Acres",                      labelAr: "مساحة المشروع",             enabled: true,  required: true,  fieldType: "textarea" },
  { key: "projectDetails",         labelEn: "Project Details & Facilities",       labelAr: "تفاصيل المشروع والمرافق",   enabled: true,  required: true,  fieldType: "textarea" },
  { key: "unitTypes",              labelEn: "Unit Types",                         labelAr: "أنواع الوحدات",             enabled: true,  required: true,  fieldType: "textarea" },
  { key: "pricesAndAcres",         labelEn: "Prices & Acres",                     labelAr: "الأسعار والمساحات",         enabled: true,  required: true,  fieldType: "textarea" },
  { key: "paymentPlan",            labelEn: "Payment Plan",                       labelAr: "خطة السداد",                enabled: true,  required: true,  fieldType: "textarea", layout: "full" },
  { key: "finishingType",          labelEn: "Finishing Type",                     labelAr: "نوع التشطيب",               enabled: true,  required: true,  fieldType: "dropdown",
    options: ["Fully Finished Furnished", "Fully Finished", "Semi Finished", "Flexi Finished", "Core, Shell"] },
  { key: "construction",           labelEn: "Construction",                       labelAr: "مرحلة الإنشاء",             enabled: true,  required: true,  fieldType: "dropdown",
    options: ["Ready", "Off Plan", "Construction in Progress"] },
  { key: "deliveryDate",           labelEn: "Delivery Date",                      labelAr: "تاريخ التسليم",             enabled: true,  required: true,  fieldType: "date",    layout: "full" },
  { key: "maintenance",            labelEn: "Maintenance",                        labelAr: "الصيانة",                   enabled: true,  required: false, fieldType: "textarea" },
  { key: "investorType",           labelEn: "Engineering Consultant",             labelAr: "الاستشاري الهندسي",         enabled: true,  required: false, fieldType: "textarea" },
  { key: "managementAndOperations",labelEn: "Management & Operations",            labelAr: "الإدارة والتشغيل",          enabled: true,  required: false, fieldType: "textarea" },
  { key: "termsOfContract",        labelEn: "Terms of the Operating Contract",    labelAr: "شروط عقد التشغيل",          enabled: true,  required: false, fieldType: "textarea" },
  { key: "sellingPoints",          labelEn: "Selling Points",                     labelAr: "نقاط البيع",                enabled: true,  required: true,  fieldType: "textarea" },
  { key: "weaknessPoints",         labelEn: "Weakness Points",                    labelAr: "نقاط الضعف",                enabled: true,  required: true,  fieldType: "textarea" },
  { key: "additionalNotes",        labelEn: "Additional Notes",                   labelAr: "ملاحظات إضافية",            enabled: true,  required: false, fieldType: "textarea", layout: "full" },
  { key: "owner",                  labelEn: "Owner",                              labelAr: "المالك",                    enabled: false },
];

export const DEFAULT_CONFIG: CRMTasksConfig = {
  ads:            { enabled: true, linkCount: 3 },
  knowledge:      { enabled: true, fields: DEFAULT_FIELDS },
  calls:          { enabled: true },
  rotation:       { enabled: true },
  customTasks:      [],
  requestsTarget:   3,
  meetingsTarget:   1,
  knowledgeTarget:  2,
};

const KEY = "opshub-crm-task-config-v1";
const listeners = new Set<() => void>();

export function loadCRMTaskConfig(): CRMTasksConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Partial<CRMTasksConfig>;
    // Merge with defaults so new fields added later still appear
    const fields = DEFAULT_FIELDS.map(def => {
      const saved_f = saved.knowledge?.fields?.find(f => f.key === def.key);
      return saved_f ? { ...def, ...saved_f } : def;
    });
    return {
      ads:            { ...DEFAULT_CONFIG.ads,       ...(saved.ads ?? {}) },
      knowledge:      { ...DEFAULT_CONFIG.knowledge, ...(saved.knowledge ?? {}), fields },
      calls:          { ...DEFAULT_CONFIG.calls,     ...(saved.calls ?? {}) },
      rotation:       { ...DEFAULT_CONFIG.rotation,  ...(saved.rotation ?? {}) },
      customTasks:    saved.customTasks ?? [],
      requestsTarget:  saved.requestsTarget  ?? DEFAULT_CONFIG.requestsTarget,
      meetingsTarget:  saved.meetingsTarget  ?? DEFAULT_CONFIG.meetingsTarget,
      knowledgeTarget: Math.max(2, saved.knowledgeTarget ?? DEFAULT_CONFIG.knowledgeTarget),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveCRMTaskConfig(config: CRMTasksConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config));
  listeners.forEach(cb => cb());
}

export function onCRMTaskConfigChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
