
export type Role = 'CENTRAL_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'ASSISTANT' | 'SCREEN' | 'ADVERTISER';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  specialty?: string;
  clinicId?: string;
  advertiserId?: string;
  avatar?: string; // Base64 data URL for profile picture
}

export interface Clinic {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  specialties: string[];
  adminId: string;
  logo?: string; // Base64 data URL for the clinic logo
}

export interface Cabin {
  id: string;
  name: string;
  clinicId: string;
  currentDoctorId?: string;
}

export interface RegistrationForm {
  id: string;
  name: string;
  clinicId: string;
  fields: string[];
  qrCodeUrl: string;
}

export interface Token {
  id: string;
  number: number;
  tokenInitial?: string; // Prefix from the group (max 3 chars)
  patientName: string;
  patientEmail?: string;
  patientData: Record<string, string>;
  status: 'WAITING' | 'CALLING' | 'CONSULTING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  clinicId: string;
  groupId?: string; // Scoped to a specific group
  cabinId?: string;
  doctorId?: string; // The specific doctor who attended the visit
  timestamp: number;
  visitStartTime?: number;
  visitEndTime?: number;
  lastRecalledTimestamp?: number;
}

export interface AdVideo {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'local' | 'b2';
  advertiserId: string;
  stats: {
    views: number;
    lastViewed?: number;
  };
}

export interface Advertiser {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface ClinicGroup {
  id: string;
  name: string;
  clinicId: string;
  tokenInitial?: string; // Max 3 characters
  doctorIds: string[];
  assistantIds: string[];
  screenIds: string[];
  cabinIds: string[];
  formId?: string; // Each group has exactly one form
  formTitle?: string; // The title of the registration form
  formFields?: string[]; // Custom fields for this group's form
}

export interface Specialty {
  id: string;
  name: string;
  forClinic: boolean;
  forDoctor: boolean;
}

export interface AppState {
  clinics: Clinic[];
  users: User[];
  advertisers: Advertiser[];
  cabins: Cabin[];
  forms: RegistrationForm[];
  tokens: Token[];
  videos: AdVideo[];
  groups: ClinicGroup[];
  specialties: Specialty[];
}
