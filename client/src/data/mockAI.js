// OncoTrace AI — Mock AI Data

export const mockConversations = [
  {
    id:        'msg-001',
    role:      'assistant',
    content:   "Hello Anand. I have reviewed your latest clinical data including your Cycle 12 ctDNA results, recent CT imaging, and treatment history.\n\nYour ctDNA has decreased to **0.18% MAF**, which represents a **47% reduction** from your Cycle 9 baseline. This is a strong indicator of continued molecular response to Osimertinib.\n\nIs there anything specific you would like to explore today?",
    timestamp: '2024-10-14T09:00:00',
    type:      'greeting',
  },
  {
    id:        'msg-002',
    role:      'user',
    content:   'What does my latest ctDNA result mean for my treatment?',
    timestamp: '2024-10-14T09:01:30',
    type:      'question',
  },
  {
    id:        'msg-003',
    role:      'assistant',
    content:   "Your ctDNA result of **0.18% MAF** is very encouraging. Here is what it means:\n\n**What is ctDNA?**\nCirculating tumor DNA fragments shed by cancer cells into your bloodstream. The MAF tells us what percentage of cell-free DNA comes from tumor cells.\n\n**Your trajectory:**\n- Cycle 1 (Nov 2023): 0.82% MAF\n- Cycle 9 (May 2024): 0.34% MAF\n- Cycle 12 (Oct 2024): 0.18% MAF\n\n**What this means:**\nThis consistent decline strongly suggests Osimertinib is effectively controlling your cancer at the molecular level. No resistance mutations have been detected.\n\nWould you like me to explain the MET Exon 14 co-alteration?",
    timestamp: '2024-10-14T09:01:45',
    type:      'answer',
  },
  {
    id:        'msg-004',
    role:      'user',
    content:   'Yes, tell me about the MET alteration.',
    timestamp: '2024-10-14T09:03:00',
    type:      'question',
  },
  {
    id:        'msg-005',
    role:      'assistant',
    content:   "The **MET Exon 14 skipping alteration** found in your February 2024 genomic profile is an important finding.\n\n**What is MET Exon 14 skipping?**\nMET is a gene that controls cell growth. The Exon 14 skipping mutation causes the MET protein to become overactive.\n\n**Why it matters:**\nIn NSCLC patients on EGFR-targeted therapy, MET alterations are a known mechanism of acquired resistance. However, your current ctDNA shows no evidence this alteration is driving resistance.\n\n**Available therapies:**\nCapmatinib and Tepotinib specifically address MET Exon 14 alterations if needed.\n\n**Current recommendation:**\nContinue Osimertinib. Your response is excellent. MET amplification is being tracked via serial ctDNA monitoring.",
    timestamp: '2024-10-14T09:03:20',
    type:      'answer',
  },
]

export const suggestedPrompts = [
  {
    id:       'SP-001',
    category: 'Results',
    label:    'Explain my latest ctDNA results',
    icon:     'flask',
  },
  {
    id:       'SP-002',
    category: 'Treatment',
    label:    'What are the side effects of Osimertinib?',
    icon:     'pill',
  },
  {
    id:       'SP-003',
    category: 'Genomics',
    label:    'What does EGFR Exon 19 deletion mean?',
    icon:     'dna',
  },
  {
    id:       'SP-004',
    category: 'Appointments',
    label:    'What should I prepare for my next visit?',
    icon:     'calendar',
  },
  {
    id:       'SP-005',
    category: 'Lifestyle',
    label:    'What dietary guidelines should I follow?',
    icon:     'heart',
  },
  {
    id:       'SP-006',
    category: 'Research',
    label:    'Are there clinical trials I qualify for?',
    icon:     'search',
  },
]

export const aiRecommendations = [
  {
    id:         'REC-001',
    priority:   'high',
    category:   'Monitoring',
    title:      'Schedule Cycle 13 Liquid Biopsy',
    summary:    'Your next ctDNA blood draw is due November 7th. Early scheduling recommended to ensure timely results before your November 15th telehealth visit.',
    action:     'Book Appointment',
    actionPath: '/appointments',
    confidence: 98,
    generated:  '2024-10-14',
  },
  {
    id:         'REC-002',
    priority:   'medium',
    category:   'Genetics',
    title:      'MET Amplification Monitoring',
    summary:    'Given MET Exon 14 co-alteration, serial monitoring with expanded cfDNA panel at each cycle is recommended.',
    action:     'View Genomic Report',
    actionPath: '/medical-records',
    confidence: 87,
    generated:  '2024-10-14',
  },
  {
    id:         'REC-003',
    priority:   'low',
    category:   'Lifestyle',
    title:      'Pulmonary Rehabilitation Evaluation',
    summary:    'Based on your ECOG status and treatment duration, a pulmonary rehabilitation program may improve exercise capacity.',
    action:     'Learn More',
    actionPath: '/ai',
    confidence: 74,
    generated:  '2024-10-12',
  },
  {
    id:         'REC-004',
    priority:   'medium',
    category:   'Clinical Trial',
    title:      'MARIPOSA-2 Trial — Potential Eligibility',
    summary:    'Based on your EGFR/MET co-alteration profile, you may qualify for the MARIPOSA-2 clinical trial.',
    action:     'View Details',
    actionPath: '/ai',
    confidence: 81,
    generated:  '2024-10-10',
  },
]

export const healthSummary = {
  generated:     '2024-10-14T08:30:00',
  overallStatus: 'Responding to Treatment',
  statusColor:   'success',
  headline:      'Strong molecular and radiographic response at Cycle 12.',
  keyPoints: [
    'ctDNA decreased 78% from peak (0.82% to 0.18% MAF)',
    'Tumor reduced 38% from baseline on CT imaging',
    'No acquired resistance mutations detected',
    'Treatment well-tolerated — Grade 1 toxicity only',
    'Next milestone: Cycle 13 assessment in November 2024',
  ],
  riskFactors: [
    'MET Exon 14 co-alteration — monitor for resistance',
    'Prolonged TKI therapy — cardiac and hepatic surveillance',
  ],
  positiveFactors: [
    'EGFR Exon 19del — optimal Osimertinib target',
    'Never-smoker — favorable response profile',
    'PD-L1 65% — immunotherapy option if needed',
    'Good performance status (ECOG 1)',
  ],
  nextSteps: [
    'Cycle 13 ctDNA — November 7, 2024',
    'Telehealth visit with Dr. Nair — November 15, 2024',
    'Next CT chest imaging — December 2024',
  ],
}