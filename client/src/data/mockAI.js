// Stroke AI — Mock AI Data

// Conversation history for the AI Assistant. Grouping into Today/Yesterday/
// Earlier is done relative to the most recent conversation's `updatedAt`
// (not the real device date) — these are fixed illustrative dates, same
// convention already used by the mock appointments/reports data.
export const mockConversations = [
  {
    id: 'conv-nihss-afib',
    title: 'NIHSS score and AFib finding',
    updatedAt: '2024-10-14T09:03:20',
    messages: [
      {
        id: 'msg-001',
        role: 'assistant',
        content: "Hello Anand. I have reviewed your latest clinical data including your most recent NIHSS assessment, follow-up brain imaging, and treatment history.\n\nYour NIHSS score has improved to **2**, down from **8** at admission — a strong indicator of continued neurological recovery on your current medication regimen.\n\nIs there anything specific you would like to explore today?",
        timestamp: '2024-10-14T09:00:00',
      },
      {
        id: 'msg-002',
        role: 'user',
        content: 'What does my latest NIHSS score mean for my recovery?',
        timestamp: '2024-10-14T09:01:30',
      },
      {
        id: 'msg-003',
        role: 'assistant',
        content: "Your NIHSS score of **2** is very encouraging. Here is what it means:\n\n**What is the NIHSS?**\nThe National Institutes of Health Stroke Scale measures the severity of neurological impairment after a stroke. Lower scores indicate milder impairment and better function.\n\n**Your trajectory:**\n- Admission (Sep 2024): 8\n- 6-week follow-up (early Oct 2024): 4\n- Most recent assessment (Oct 2024): 2\n\n**What this means:**\nThis steady decline strongly suggests your brain is recovering well and your current treatment plan — including antiplatelet therapy and rehabilitation — is working effectively.\n\nWould you like me to explain the atrial fibrillation finding from your cardiac monitoring?",
        timestamp: '2024-10-14T09:01:45',
      },
      {
        id: 'msg-004',
        role: 'user',
        content: 'Yes, tell me about the atrial fibrillation finding.',
        timestamp: '2024-10-14T09:03:00',
      },
      {
        id: 'msg-005',
        role: 'assistant',
        content: "The **atrial fibrillation (AFib)** detected during your cardiac monitoring after your stroke is an important finding.\n\n**What is atrial fibrillation?**\nAFib is an irregular heart rhythm that can allow blood clots to form in the heart. If a clot travels to the brain, it can cause a stroke.\n\n**Why it matters:**\nIdentifying AFib as a possible source helps your care team choose the right long-term therapy to reduce your risk of another stroke.\n\n**Available options:**\nAnticoagulant medications, such as apixaban or warfarin, are often considered alongside or in place of antiplatelet therapy when AFib is confirmed.\n\n**Current recommendation:**\nContinue your current medications and complete the extended cardiac rhythm monitoring your care team has ordered. Your recovery is progressing well, and this will help finalize your long-term prevention plan.",
        timestamp: '2024-10-14T09:03:20',
      },
    ],
  },
  {
    id: 'conv-med-side-effects',
    title: 'Medication side effects',
    updatedAt: '2024-10-14T14:22:00',
    messages: [
      {
        id: 'msg-101',
        role: 'user',
        content: 'What side effects should I watch for with Clopidogrel and Atorvastatin?',
        timestamp: '2024-10-14T14:20:00',
      },
      {
        id: 'msg-102',
        role: 'assistant',
        content: "Here's what to watch for with your current medications:\n\n**Clopidogrel 75mg** — an antiplatelet that reduces clot risk. Watch for unusual bruising, bleeding gums, or blood in stool/urine. Take it with food if it upsets your stomach.\n\n**Atorvastatin 40mg** — a statin for cholesterol. Watch for unexplained muscle pain or weakness, which can (rarely) signal a rare muscle side effect.\n\nContact your care team promptly if you notice either, but don't stop either medication on your own — they're both protecting against another stroke.",
        timestamp: '2024-10-14T14:22:00',
      },
    ],
  },
  {
    id: 'conv-rehab-progress',
    title: 'Rehab session progress',
    updatedAt: '2024-10-13T11:05:00',
    messages: [
      {
        id: 'msg-201',
        role: 'user',
        content: 'How is my rehab progress looking so far?',
        timestamp: '2024-10-13T11:00:00',
      },
      {
        id: 'msg-202',
        role: 'assistant',
        content: "You're on session 12 of 18 in your physical and speech therapy program, and the trend is positive — your care team notes improved mobility and strength, with no new neurological deficits on your last imaging.\n\nModified Rankin Scale is currently at 1, indicating good functional independence. Keep attending your scheduled sessions — consistency is the biggest driver of continued recovery at this stage.",
        timestamp: '2024-10-13T11:05:00',
      },
    ],
  },
  {
    id: 'conv-followup-prep',
    title: 'Preparing for my next follow-up',
    updatedAt: '2024-10-08T16:48:00',
    messages: [
      {
        id: 'msg-301',
        role: 'user',
        content: 'What should I prepare for my November 15th follow-up visit?',
        timestamp: '2024-10-08T16:45:00',
      },
      {
        id: 'msg-302',
        role: 'assistant',
        content: "For your November 15th telehealth visit with Dr. Nair, it would help to bring:\n\n- Your home blood pressure log since your last visit\n- A list of any new or worsening symptoms\n- Questions about your carotid Doppler results from November 7th\n\nYour next follow-up brain MRI is scheduled for December, so this visit will likely focus on medication review and rehab progress.",
        timestamp: '2024-10-08T16:48:00',
      },
    ],
  },
  {
    id: 'conv-lifestyle-risk',
    title: 'Lifestyle changes to reduce risk',
    updatedAt: '2024-10-02T10:18:00',
    messages: [
      {
        id: 'msg-401',
        role: 'user',
        content: 'What lifestyle changes can help reduce my risk of another stroke?',
        timestamp: '2024-10-02T10:15:00',
      },
      {
        id: 'msg-402',
        role: 'assistant',
        content: "A few changes make a meaningful difference alongside your medications:\n\n- **Blood pressure**: keep home readings within the range your care team set, and log them daily\n- **Diet**: a lower-sodium, Mediterranean-style diet supports both blood pressure and cholesterol\n- **Activity**: gentle, regular movement as cleared by your rehab team\n- **No smoking**: you're already a non-smoker, which is a strong protective factor\n\nYour family support is also a real asset here — patients with consistent support tend to stick with rehab and lifestyle changes more successfully.",
        timestamp: '2024-10-02T10:18:00',
      },
    ],
  },
]

export const suggestedPrompts = [
  {
    id:       'SP-001',
    category: 'Results',
    label:    'Explain my latest NIHSS assessment',
    icon:     'flask',
  },
  {
    id:       'SP-002',
    category: 'Treatment',
    label:    'What are the side effects of my medications?',
    icon:     'pill',
  },
  {
    id:       'SP-003',
    category: 'Recovery',
    label:    'What does my stroke diagnosis mean for recovery?',
    icon:     'dna',
  },
  {
    id:       'SP-004',
    category: 'Appointments',
    label:    'What should I prepare for my next follow-up visit?',
    icon:     'calendar',
  },
  {
    id:       'SP-005',
    category: 'Lifestyle',
    label:    'What lifestyle changes can reduce my stroke risk?',
    icon:     'heart',
  },
  {
    id:       'SP-006',
    category: 'Rehabilitation',
    label:    'What rehabilitation programs are available for me?',
    icon:     'search',
  },
]

export const aiRecommendations = [
  {
    id:         'REC-001',
    priority:   'high',
    category:   'Monitoring',
    title:      'Schedule Follow-up Carotid Doppler',
    summary:    'Your next carotid Doppler ultrasound is due November 7th. Early scheduling recommended to ensure timely results before your November 15th telehealth visit.',
    action:     'Book Appointment',
    actionPath: '/dashboard/appointments',
    confidence: 98,
    generated:  '2024-10-14',
  },
  {
    id:         'REC-002',
    priority:   'medium',
    category:   'Monitoring',
    title:      'Blood Pressure Monitoring Reminder',
    summary:    'Your home blood pressure logs show occasional readings above target range. Consistent daily monitoring can help your care team fine-tune your medication dosing.',
    action:     'View Health Log',
    actionPath: '/dashboard/medical-records',
    confidence: 87,
    generated:  '2024-10-14',
  },
  {
    id:         'REC-003',
    priority:   'low',
    category:   'Lifestyle',
    title:      'Speech Therapy Evaluation',
    summary:    'Based on your recovery progress and NIHSS trend, a speech-language therapy evaluation may help address residual communication difficulties.',
    action:     'Learn More',
    actionPath: '/dashboard/ai',
    confidence: 74,
    generated:  '2024-10-12',
  },
  {
    id:         'REC-004',
    priority:   'medium',
    category:   'Cardiology',
    title:      'Cardiac Rhythm Monitoring for AFib',
    summary:    'Based on your recent atrial fibrillation finding, extended cardiac rhythm monitoring is recommended to help guide long-term stroke-prevention therapy.',
    action:     'View Details',
    actionPath: '/dashboard/ai',
    confidence: 81,
    generated:  '2024-10-10',
  },
]

export const healthSummary = {
  generated:     '2024-10-14T08:30:00',
  overallStatus: 'Recovering Well',
  statusColor:   'success',
  headline:      'Strong neurological and functional improvement since admission.',
  keyPoints: [
    'NIHSS score improved from 8 to 2 since admission (75% reduction)',
    'Increased mobility and strength during physical therapy sessions',
    'No new neurological deficits on follow-up imaging',
    'Blood pressure trending toward target range on current regimen',
    'Next milestone: 3-month follow-up assessment in November 2024',
  ],
  riskFactors: [
    'Atrial fibrillation — monitor for cardioembolic risk',
    'Elevated LDL cholesterol — statin dose adjustment may be needed',
  ],
  positiveFactors: [
    'Rapid initiation of treatment after symptom onset — favorable recovery profile',
    'Non-smoker — lower risk of recurrent stroke',
    'Strong family support — improved rehab adherence',
    'Good functional independence (modified Rankin Scale 1)',
  ],
  nextSteps: [
    'Follow-up carotid Doppler — November 7, 2024',
    'Telehealth visit with Dr. Nair — November 15, 2024',
    'Next follow-up brain MRI — December 2024',
  ],
}
