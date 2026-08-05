// OncoTrace AI — Mock Patient Data

export const mockPatient = {
  id: 'PAT-2024-00147',

  personalInfo: {
    firstName:   'Anand',
    lastName:    'Krishnamurthy',
    fullName:    'Anand Krishnamurthy',
    dateOfBirth: '1978-03-15',
    age:         46,
    gender:      'Male',
    email:       'anand.k@oncotrace.ai',
    phone:       '+1 (415) 882-4471',
    address:     '2847 Pacific Heights Blvd, San Francisco, CA 94115',
    nationality: 'Indian-American',
    language:    'English',
    timezone:    'America/Los_Angeles',
  },

  medical: {
    mrn:              'MRN-SF-2024-7741',
    bloodGroup:       'B+',
    height:           "5'10\"",
    weight:           '74 kg',
    bmi:              23.6,
    primaryDiagnosis: 'Non-Small Cell Lung Cancer (NSCLC)',
    diagnosisCode:    'C34.10',
    stage:            'Stage IIIA',
    diagnosisDate:    '2023-09-04',
    primarySite:      'Right Upper Lobe',
    histology:        'Adenocarcinoma',
    grade:            'Grade 2 — Moderately Differentiated',
    smokingHistory:   'Never smoker',
    ecogStatus:       1,
    ecogLabel:        'Restricted in physically strenuous activity',
  },

  oncologist: {
    name:      'Dr. Priya Nair',
    specialty: 'Medical Oncologist',
    hospital:  'UCSF Helen Diller Cancer Center',
    phone:     '+1 (415) 353-9888',
    email:     'priya.nair@ucsf.edu',
    nextVisit: '2024-10-28',
    avatar:    'PN',
  },

  care_team: [
    {
      name:     'Dr. James Okafor',
      role:     'Radiation Oncologist',
      hospital: 'UCSF Medical Center',
      avatar:   'JO',
    },
    {
      name:     'Dr. Sarah Chen',
      role:     'Pulmonologist',
      hospital: 'UCSF Medical Center',
      avatar:   'SC',
    },
    {
      name:     'Meera Pillai, NP',
      role:     'Oncology Nurse Practitioner',
      hospital: 'UCSF Helen Diller Cancer Center',
      avatar:   'MP',
    },
    {
      name:     'Dr. Rajan Mehta',
      role:     'Radiologist',
      hospital: 'UCSF Imaging Center',
      avatar:   'RM',
    },
  ],

  biomarkers: [
    {
      name:         'EGFR',
      status:       'Mutated',
      variant:      'Exon 19 deletion',
      significance: 'Targetable',
    },
    {
      name:         'ALK',
      status:       'Negative',
      variant:      null,
      significance: 'Wildtype',
    },
    {
      name:         'PD-L1',
      status:       'Positive',
      variant:      'TPS 65%',
      significance: 'High expression',
    },
    {
      name:         'KRAS',
      status:       'Negative',
      variant:      null,
      significance: 'Wildtype',
    },
    {
      name:         'ROS1',
      status:       'Negative',
      variant:      null,
      significance: 'Wildtype',
    },
    {
      name:         'MET',
      status:       'Amplified',
      variant:      'MET Exon 14',
      significance: 'Targetable',
    },
    {
      name:         'TP53',
      status:       'Mutated',
      variant:      'R248W',
      significance: 'Co-mutation',
    },
    {
      name:         'BRAF',
      status:       'Negative',
      variant:      null,
      significance: 'Wildtype',
    },
  ],

  vitals: {
    lastUpdated:     '2024-10-14',
    heartRate:       72,
    bloodPressure:   '118/76',
    oxygenSat:       97,
    temperature:     98.4,
    respiratoryRate: 16,
    weight:          74,
  },

  healthScore: {
    current:  78,
    previous: 71,
    trend:    'improving',
    lastCalc: '2024-10-14',
  },

  ctDNA: {
    current:  0.18,
    previous: 0.34,
    unit:     '% MAF',
    trend:    'decreasing',
    lastTest: '2024-10-10',
    nextTest: '2024-11-07',
    status:   'Responding',
  },

  riskScore: {
    current:  34,
    previous: 48,
    trend:    'improving',
    category: 'Moderate',
    lastCalc: '2024-10-14',
  },

  treatment: {
    currentRegimen: 'Osimertinib (Tagrisso) 80mg QD',
    startDate:      '2023-11-01',
    cycle:          12,
    totalCycles:    18,
    response:       'Partial Response',
    responseDate:   '2024-04-15',
    nextReview:     '2024-11-15',
  },

  allergies: [
    {
      substance: 'Penicillin',
      reaction:  'Rash',
      severity:  'Moderate',
    },
    {
      substance: 'Sulfonamides',
      reaction:  'Hypersensitivity',
      severity:  'Mild',
    },
  ],

  medications: [
    {
      name:      'Osimertinib',
      dose:      '80mg',
      frequency: 'Once daily',
      since:     '2023-11-01',
    },
    {
      name:      'Ondansetron',
      dose:      '8mg',
      frequency: 'As needed',
      since:     '2023-11-01',
    },
    {
      name:      'Pantoprazole',
      dose:      '40mg',
      frequency: 'Once daily',
      since:     '2023-11-01',
    },
    {
      name:      'Vitamin D3',
      dose:      '2000 IU',
      frequency: 'Once daily',
      since:     '2024-01-10',
    },
  ],
}

export const emergencyContacts = [
  {
    id:           'EC-001',
    name:         'Lakshmi Krishnamurthy',
    relationship: 'Spouse',
    phone:        '+1 (415) 882-4472',
    email:        'lakshmi.k@gmail.com',
    isPrimary:    true,
  },
  {
    id:           'EC-002',
    name:         'Vikram Krishnamurthy',
    relationship: 'Brother',
    phone:        '+1 (408) 771-3390',
    email:        'vikram.kr@gmail.com',
    isPrimary:    false,
  },
]

export const insuranceData = {
  primary: {
    provider:    'Blue Shield of California',
    planName:    'Blue Shield PPO Platinum',
    memberId:    'BSC-9847-2024-AK',
    groupNumber: 'GRP-440821',
    effective:   '2024-01-01',
    expires:     '2024-12-31',
    copay:       '$20',
    deductible:  '$1,500 / $3,000 family',
    ooMax:       '$5,000 / $10,000 family',
    phone:       '1-800-393-6130',
  },
  secondary: {
    provider:    'Medicare Part B',
    planName:    'Medicare Supplement Plan G',
    memberId:    'MED-AK-4471829',
    groupNumber: null,
    effective:   '2024-03-01',
    expires:     '2024-12-31',
    copay:       '$0 after deductible',
    deductible:  '$240 annual',
  },
}