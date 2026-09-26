import type { ImagingModality } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// The pitch account's imaging studies and their radiology reports.
//
// ⚠️ THE REPORT IS THE RECORD; THE IMAGES ARE ILLUSTRATIVE. The reports tell
// her story consistently with the rest of the record (a hyperacute left MCA
// stroke, thrombolysed; a fall at onset; an MRI in August). The images come
// from the NLM Visible Human Project and are labelled as sample images; where
// they could not show the findings described, the study says so.
//
// Reported by SD-S-07 Dr Neha Bhatt (Consultant Radiologist, Indostates
// Whitefield) — the atlas cast's radiologist — by teleradiology for the
// Coimbatore scans. The fall at onset, the skull and C-spine X-rays, the
// C-spine CT and the MRI are flagged atlas extensions.
//
// `{admit}` / `{admit+1}` in the text are filled with the study dates at seed
// time, so the prose never disagrees with the dates shown beside it.
// ─────────────────────────────────────────────────────────────────────────────

export type StudyDay = 'admit' | 'admit+1' | 'mri';

export interface DemoStudy {
  key: string;
  build: 'ctBrain0' | 'ctBrain24' | 'ctAngio' | 'ctCspine' | 'xrSkull' | 'xrCspine' | 'mrBrain';
  title: string;
  modality: ImagingModality;
  bodyPart: string;
  day: StudyDay;
  performed: string;
  reported: string;
  facility: string;
  orderedBy: string;
  isAtlasVocabulary: boolean;
  illustrativeNote: string | null;
  report: {
    clinicalIndication: string;
    technique: string;
    comparison: string;
    findings: string;
    impression: string;
  };
}

export const RADIOLOGIST = {
  name: 'Dr. Neha Bhatt',
  registration: 'HPR IN-HPR-2871003',
  role: 'Consultant Radiologist',
  facility: 'Indostates Whitefield, Bengaluru (teleradiology)',
};

export const ATTRIBUTION =
  'Sample images, not your own scan · Courtesy of the U.S. National Library of Medicine (Visible Human Project).';

const COIMBATORE = 'IndoStates Health Hospital, Coimbatore — Radiology';

export const STUDIES: DemoStudy[] = [
  {
    key: 'ct-brain-d0',
    build: 'ctBrain0',
    title: 'CT Brain — plain',
    modality: 'CT',
    bodyPart: 'Brain',
    day: 'admit',
    performed: '08:05',
    reported: '08:19',
    facility: COIMBATORE,
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: true,
    illustrativeNote: null,
    report: {
      clinicalIndication:
        'Sudden right-sided weakness and slurred speech this morning; code stroke. Not on anticoagulants.',
      technique:
        'Non-contrast CT of the brain, axial 5 mm sections from the foramen magnum to the vertex.',
      comparison: 'None.',
      findings:
        'No intracranial haemorrhage or extra-axial collection. Subtle loss of grey–white differentiation in the left insular cortex (loss of the insular ribbon), without an established hypodensity. No hyperdense vessel sign. The ventricles and sulci are normal for age. No midline shift; the basal cisterns are patent. The posterior fossa is normal. The calvarium is intact; the visualised paranasal sinuses and mastoid air cells are clear.',
      impression:
        '1. No intracranial haemorrhage.\n2. Subtle early ischaemic change in the left insula (left MCA territory), ASPECTS 9.\n3. No skull fracture.\nFindings conveyed to the Emergency team at 08:17.',
    },
  },
  {
    key: 'cta-head-neck',
    build: 'ctAngio',
    title: 'CT Angiogram — Head and Neck',
    modality: 'CT',
    bodyPart: 'Head and neck',
    day: 'admit',
    performed: '08:12',
    reported: '08:34',
    facility: COIMBATORE,
    orderedBy: 'Emergency Department (code stroke)',
    isAtlasVocabulary: true,
    illustrativeNote:
      'The sample images cover the head only and do not show the findings described in this report.',
    report: {
      clinicalIndication: 'Acute left MCA syndrome, NIHSS 9. Assess for large-vessel occlusion.',
      technique:
        'CT angiography from the aortic arch to the vertex after intravenous iodinated contrast; thin axial sections with maximum-intensity projections.',
      comparison: 'CT brain of {admit}.',
      findings:
        'Neck: normal three-vessel aortic arch. A small calcified plaque at the left carotid bulb causes less than 30% stenosis (NASCET). Both internal carotid and both vertebral arteries are patent, with no dissection.\nHead: calcification of both cavernous internal carotid arteries. The A1, M1 and both left M2 divisions opacify normally. There is subtly reduced opacification of a few distal left MCA cortical branches over the frontal operculum compared with the right. No aneurysm of 3 mm or more; no vascular malformation.\nOther: the lung apices are clear. Mild C5–C6 disc-space narrowing.',
      impression:
        '1. No large-vessel occlusion.\n2. Paucity of distal left MCA cortical branches over the frontal operculum, in keeping with a distal branch occlusion in this clinical context.\n3. Less than 30% stenosis at the left carotid bulb.\n4. No aneurysm.',
    },
  },
  {
    key: 'ct-cspine',
    build: 'ctCspine',
    title: 'CT Cervical Spine — plain',
    modality: 'CT',
    bodyPart: 'Neck (cervical spine)',
    day: 'admit',
    performed: '09:05',
    reported: '09:40',
    facility: COIMBATORE,
    orderedBy: 'Emergency Department',
    isAtlasVocabulary: false,
    illustrativeNote: null,
    report: {
      clinicalIndication:
        'Fall at home at the onset of symptoms; neck pain on movement. Clear the cervical spine.',
      technique:
        'Non-contrast CT of the cervical spine, axial 1 mm sections with sagittal reformats, skull base to T1.',
      comparison: 'None.',
      findings:
        'Alignment is maintained, including at the craniocervical and cervicothoracic junctions. Vertebral body heights are preserved. No fracture is seen. Mild disc-space narrowing at C5–C6 with small anterior osteophytes. The facet joints are congruent. The prevertebral soft tissues are of normal thickness. The visualised lung apices are clear.',
      impression:
        '1. No cervical spine fracture or malalignment.\n2. Mild C5–C6 degenerative change.',
    },
  },
  {
    key: 'ct-brain-24h',
    build: 'ctBrain24',
    title: 'CT Brain — plain (24 hours)',
    modality: 'CT',
    bodyPart: 'Brain',
    day: 'admit+1',
    performed: '08:10',
    reported: '08:40',
    facility: 'IndoStates Health Hospital, Coimbatore — Radiology',
    orderedBy: 'Stroke Unit',
    isAtlasVocabulary: true,
    illustrativeNote: 'The sample images do not show the findings described in this report.',
    report: {
      clinicalIndication:
        '24 hours after intravenous thrombolysis. Exclude haemorrhagic transformation.',
      technique: 'Non-contrast CT of the brain, axial 5 mm sections.',
      comparison: 'CT brain and CT angiogram of {admit}.',
      findings:
        'An evolving, ill-defined hypodensity involves the left insula and frontal operculum, with mild local sulcal effacement. No haemorrhagic transformation. No mass effect; the ventricles are unchanged. No new territory is involved.',
      impression:
        '1. Evolving acute left MCA-territory infarct (insula and frontal operculum), ASPECTS 8.\n2. No haemorrhagic transformation after thrombolysis.',
    },
  },
  {
    key: 'xr-skull-ap',
    build: 'xrSkull',
    title: 'X-ray Skull — AP',
    modality: 'XR',
    bodyPart: 'Skull',
    day: 'admit+1',
    performed: '11:20',
    reported: '12:05',
    facility: 'IndoStates Health Hospital, Coimbatore — Radiology',
    orderedBy: 'Stroke Unit',
    isAtlasVocabulary: false,
    illustrativeNote: null,
    report: {
      clinicalIndication: 'Fall at the onset of the stroke; tender over the right parietal scalp.',
      technique: 'Single AP view of the skull.',
      comparison: 'CT brain of {admit}.',
      findings:
        'No fracture is seen. The vault is of normal thickness and density, with no sutural diastasis. The visualised paranasal sinuses are clear. No radio-opaque foreign body.',
      impression: 'No skull fracture on this view.',
    },
  },
  {
    key: 'xr-cspine-lat',
    build: 'xrCspine',
    title: 'X-ray Cervical Spine — Lateral',
    modality: 'XR',
    bodyPart: 'Neck (cervical spine)',
    day: 'admit+1',
    performed: '11:25',
    reported: '12:10',
    facility: 'IndoStates Health Hospital, Coimbatore — Radiology',
    orderedBy: 'Stroke Unit',
    isAtlasVocabulary: false,
    illustrativeNote: 'The sample image is reconstructed from CT.',
    report: {
      clinicalIndication: 'Fall at the onset of the stroke; neck pain on movement.',
      technique: 'Lateral view of the cervical spine.',
      comparison: 'CT cervical spine of {admit}.',
      findings:
        'Alignment is maintained. Vertebral body heights are preserved; no fracture or listhesis. Mild disc-space narrowing at C5–C6 with small anterior osteophytes. The prevertebral soft tissues are normal. The C7–T1 junction is partly obscured by the shoulders.',
      impression:
        '1. Mild C5–C6 degenerative change.\n2. No fracture seen; C7–T1 not clearly shown — see the CT of {admit}.',
    },
  },
  {
    key: 'mri-brain',
    build: 'mrBrain',
    title: 'MRI Brain',
    modality: 'MR',
    bodyPart: 'Brain',
    day: 'mri',
    performed: '10:30',
    reported: '14:05',
    facility: 'Indostates Whitefield — Radiology',
    orderedBy: 'Dr. Rohit Desai',
    isAtlasVocabulary: false,
    illustrativeNote: 'The sample images do not show the findings described in this report.',
    report: {
      clinicalIndication:
        'Seven weeks after a thrombolysed left MCA stroke. Word-finding difficulty and right arm weakness, improving.',
      technique:
        '1.5 T MRI of the brain: axial T2, FLAIR, T1, diffusion-weighted imaging with ADC, susceptibility-weighted imaging; 3D time-of-flight MR angiography. No contrast.',
      comparison: 'CT brain of {admit} and {admit+1}.',
      findings:
        'T2/FLAIR hyperintensity with early volume loss in the left insula and frontal operculum, measuring about 3.1 × 1.8 cm, with no restricted diffusion. No blood products on SWI and no microbleeds. A few small periventricular and deep white-matter hyperintensities (Fazekas grade 1). Mild ex-vacuo prominence of the left sylvian fissure. The brainstem and cerebellum are normal.\nMRA: the intracranial arteries are patent, the left MCA branches have recanalised, and there is no aneurysm.',
      impression:
        '1. Late subacute left MCA-territory infarct corresponding to the June event; no haemorrhage.\n2. No new infarct.\n3. Mild small-vessel change.\n4. Patent intracranial arteries.',
    },
  },
];
