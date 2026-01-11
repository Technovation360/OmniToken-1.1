
import { AppState, Token } from './types';

const generateTokens = (): Token[] => {
  const tokens: Token[] = [];
  const groups = [
    { id: 'g1', initial: 'GM', count: 10, clinicId: 'c1' },
    { id: 'g2', initial: 'CR', count: 10, clinicId: 'c1' },
    { id: 'g3', initial: 'PD', count: 10, clinicId: 'c1' }
  ];

  const names = [
    "John Doe", "Jane Smith", "Robert Brown", "Emily Davis", "Michael Wilson", 
    "Sarah Miller", "David Taylor", "Jessica Anderson", "Thomas Jackson", "Linda White",
    "Christopher Harris", "Ashley Martin", "Matthew Thompson", "Patricia Garcia", "Joshua Martinez",
    "Daniel Robinson", "Dorothy Clark", "Christopher Rodriguez", "Nancy Lewis", "Karen Lee",
    "Steven Walker", "Betty Hall", "Edward Allen", "Margaret Young", "Brian King",
    "Sandra Wright", "Kevin Scott", "Donna Green", "Ronald Baker", "Carol Adams"
  ];

  let nameIdx = 0;
  groups.forEach(group => {
    for (let i = 1; i <= group.count; i++) {
      const tsOffset = (30 - nameIdx) * 300000; // 5 min intervals back in time
      tokens.push({
        id: `t-${group.id}-${i}`,
        number: 100 + i,
        tokenInitial: group.initial,
        patientName: names[nameIdx % names.length],
        patientData: {
          phone: `555-01${10 + nameIdx}`,
          age: (20 + (nameIdx % 50)).toString(),
          gender: nameIdx % 2 === 0 ? 'Male' : 'Female',
          email: ''
        },
        status: 'WAITING',
        clinicId: group.clinicId,
        groupId: group.id,
        timestamp: Date.now() - tsOffset
      });
      nameIdx++;
    }
  });

  return tokens;
};

export const INITIAL_STATE: AppState = {
  clinics: [
    { 
      id: 'c1', 
      name: 'City General Hospital', 
      phone: '555-0199', 
      email: 'contact@citygeneral.com', 
      address: '123 Health Blvd', 
      city: 'Metro City', 
      state: 'California', 
      pincode: '90001', 
      specialties: ['General Medicine', 'Cardiology', 'Pediatrics'],
      adminId: 'u2' 
    }
  ],
  specialties: [
    { id: 's1', name: 'General Medicine', forClinic: true, forDoctor: true },
    { id: 's2', name: 'Cardiology', forClinic: true, forDoctor: true },
    { id: 's3', name: 'Pediatrics', forClinic: true, forDoctor: true },
    { id: 's4', name: 'Dermatology', forClinic: true, forDoctor: true },
    { id: 's5', name: 'Orthopedics', forClinic: true, forDoctor: true },
    { id: 's6', name: 'Neurology', forClinic: true, forDoctor: true },
    { id: 's7', name: 'Radiology', forClinic: true, forDoctor: true },
    { id: 's8', name: 'Dentistry', forClinic: true, forDoctor: true }
  ],
  advertisers: [
    { id: 'adv1', companyName: 'HealthPlus Pharmacy', contactPerson: 'Sarah Connor', email: 'ads@healthplus.com', status: 'active' },
    { id: 'adv2', companyName: 'Vitality Insurance', contactPerson: 'Mark Sloan', email: 'marketing@vitality.com', status: 'active' }
  ],
  users: [
    { id: 'u1', name: 'James Wilson', email: 'admin@omni.com', password: 'admin', role: 'CENTRAL_ADMIN' },
    { id: 'u2', name: 'Admin - City General', email: 'c1admin@omni.com', password: 'password', role: 'CLINIC_ADMIN', clinicId: 'c1' },
    
    // Doctors
    { id: 'u3', name: 'doctor1', email: 'doctor1@omni.com', password: 'password', role: 'DOCTOR', clinicId: 'c1', specialty: 'General Medicine' },
    { id: 'u6', name: 'doctor2', email: 'doctor2@omni.com', password: 'password', role: 'DOCTOR', clinicId: 'c1', specialty: 'General Medicine' },
    { id: 'u7', name: 'doctor3', email: 'doctor3@omni.com', password: 'password', role: 'DOCTOR', clinicId: 'c1', specialty: 'Cardiology' },
    { id: 'u11', name: 'doctor4', email: 'doctor4@omni.com', password: 'password', role: 'DOCTOR', clinicId: 'c1', specialty: 'Pediatrics' },
    
    // Assistants
    { id: 'u4', name: 'Assistant One', email: 'asst1@omni.com', password: 'password', role: 'ASSISTANT', clinicId: 'c1' },
    { id: 'u8', name: 'Assistant Two', email: 'asst2@omni.com', password: 'password', role: 'ASSISTANT', clinicId: 'c1' },
    
    // Screens
    { id: 'u5', name: 'Screen One', email: 'screen1@omni.com', password: 'password', role: 'SCREEN', clinicId: 'c1' },
    { id: 'u9', name: 'Screen Two', email: 'screen2@omni.com', password: 'password', role: 'SCREEN', clinicId: 'c1' },
    
    // Advertiser Login
    { id: 'u10', name: 'Sarah Connor (HealthPlus)', email: 'ads@healthplus.com', password: 'password', role: 'ADVERTISER', advertiserId: 'adv1' }
  ],
  cabins: [
    { id: 'cab1', name: 'Consultation Room 1', clinicId: 'c1' },
    { id: 'cab2', name: 'Consultation Room 2', clinicId: 'c1' },
    { id: 'cab3', name: 'Consultation Room 3', clinicId: 'c1' },
    { id: 'cab4', name: 'Consultation Room 4', clinicId: 'c1' }
  ],
  forms: [
    { 
      id: 'f1', 
      name: 'General Registration', 
      clinicId: 'c1', 
      fields: ['name', 'phone', 'email', 'age', 'gender'], 
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=sample-url' 
    }
  ],
  tokens: generateTokens(),
  videos: [
    { 
      id: 'v1', 
      title: 'Pharmacy Benefits', 
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
      type: 'youtube', 
      advertiserId: 'adv1',
      stats: { views: 1240, lastViewed: Date.now() }
    },
    { 
      id: 'v2', 
      title: 'Insurance You Can Trust', 
      url: 'https://www.youtube.com/embed/V1bFr2SWP1I', 
      type: 'youtube', 
      advertiserId: 'adv2',
      stats: { views: 856, lastViewed: Date.now() }
    }
  ],
  groups: [
    {
      id: 'g1',
      name: 'General Medicine',
      clinicId: 'c1',
      tokenInitial: 'GM',
      doctorIds: ['u3', 'u6'],     
      assistantIds: ['u4'],        
      screenIds: ['u5'],           
      cabinIds: ['cab1', 'cab2', 'cab3', 'cab4'], 
      formId: 'f1'
    },
    {
      id: 'g2',
      name: 'Cardiology',
      clinicId: 'c1',
      tokenInitial: 'CR',
      doctorIds: ['u7'],           
      assistantIds: ['u4', 'u8'], // Shared: Asst 1 (u4) and Asst 2 (u8)
      screenIds: ['u9'],          // Shared: Screen 2 (u9)
      cabinIds: ['cab3'],         
      formId: 'f1'
    },
    {
      id: 'g3',
      name: 'Pediatrics',
      clinicId: 'c1',
      tokenInitial: 'PD',
      doctorIds: ['u11', 'u3'],   // Shared: Doc 1 (u3) in Pediatrics also
      assistantIds: ['u4', 'u8'], // Shared: Asst 1 (u4) and Asst 2 (u8)
      screenIds: ['u9'],          // Shared: Screen 2 (u9)
      cabinIds: ['cab4'],         
      formId: 'f1'
    }
  ]
};

export const FIELD_OPTIONS = [
  { id: 'name', label: 'Patient Name' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'email', label: 'Email Address' },
  { id: 'age', label: 'Age' },
  { id: 'gender', label: 'Gender' },
];
