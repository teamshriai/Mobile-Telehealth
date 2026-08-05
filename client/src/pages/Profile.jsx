import { motion } from 'framer-motion'
import { User, Phone, Mail, MapPin, Droplets, Ruler, Weight, Shield, Stethoscope, Edit3 } from 'lucide-react'
import { mockPatient, emergencyContacts } from '../data/mockPatients.js'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
})

export default function Profile() {
  const patient = {
    initials: mockPatient.personalInfo.firstName[0] + mockPatient.personalInfo.lastName[0],
    name: mockPatient.personalInfo.fullName,
    age: mockPatient.personalInfo.age,
    gender: mockPatient.personalInfo.gender,
    diagnosis: mockPatient.medical.primaryDiagnosis,
    mrn: mockPatient.medical.mrn,
    id: mockPatient.id,
    dob: mockPatient.personalInfo.dateOfBirth,
    stage: mockPatient.medical.stage,
    diagnosedAt: mockPatient.medical.diagnosisDate,
    phone: mockPatient.personalInfo.phone,
    email: mockPatient.personalInfo.email,
    address: mockPatient.personalInfo.address,
    emergencyContact: emergencyContacts.find(c => c.isPrimary)?.name || emergencyContacts[0]?.name,
    bloodType: mockPatient.medical.bloodGroup,
    weight: mockPatient.medical.weight,
    height: mockPatient.medical.height,
    oncologist: mockPatient.oncologist.name,
    institution: mockPatient.oncologist.hospital,
    treatment: mockPatient.treatment.currentRegimen,
    treatmentCycle: mockPatient.treatment.cycle,
    totalCycles: mockPatient.treatment.totalCycles
  };

  return (
    <div className="p-6 min-h-full bg-[#FAFBFC]">
      <motion.div {...fade(0)} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: '"DM Sans",sans-serif' }}>Patient Profile</h1>
          <p className="text-sm text-[#64748B] mt-1">Personal, medical, and contact information</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#64748B] bg-white border border-[#E8EDF2] hover:border-[#BFDBFE] transition-all shadow-sm">
          <Edit3 className="w-3.5 h-3.5" />Edit
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <motion.div {...fade(0.05)} className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
            >
              {patient.initials}
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: '"DM Sans",sans-serif' }}>{patient.name}</h2>
            <p className="text-sm text-[#64748B] mt-0.5">Age {patient.age} · {patient.gender}</p>
            <div className="flex justify-center gap-2 mt-3">
              <span className="text-[11px] text-[#2563EB] bg-[#EFF6FF] px-3 py-1 rounded-full font-semibold border border-blue-100">
                {patient.diagnosis}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-[#F1F5F9] text-left space-y-2">
              {[
                { label: 'MRN', value: patient.mrn },
                { label: 'Patient ID', value: patient.id },
                { label: 'DOB', value: patient.dob },
                { label: 'Stage', value: patient.stage },
                { label: 'Diagnosed', value: patient.diagnosedAt },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-[11px] text-[#94A3B8]">{item.label}</span>
                  <span className="text-[11px] font-semibold text-[#0F172A]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact */}
          <motion.div {...fade(0.08)} className="bg-white rounded-2xl border border-[#E8EDF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-bold text-[#0F172A] mb-4 uppercase tracking-wider" style={{ fontFamily: '"DM Sans",sans-serif' }}>
              Contact Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Phone, label: 'Phone', value: patient.phone },
                { icon: Mail, label: 'Email', value: patient.email },
                { icon: MapPin, label: 'Address', value: patient.address },
                { icon: Shield, label: 'Emergency Contact', value: patient.emergencyContact },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-[#FAFBFC] border border-[#F1F5F9]">
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94A3B8]">{item.label}</p>
                    <p className="text-xs font-semibold text-[#0F172A] mt-0.5 break-all">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Medical */}
          <motion.div {...fade(0.12)} className="bg-white rounded-2xl border border-[#E8EDF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-bold text-[#0F172A] mb-4 uppercase tracking-wider" style={{ fontFamily: '"DM Sans",sans-serif' }}>
              Medical Details
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { icon: Droplets, label: 'Blood Type', value: patient.bloodType },
                { icon: Weight, label: 'Weight', value: patient.weight },
                { icon: Ruler, label: 'Height', value: patient.height },
                { icon: User, label: 'Gender', value: patient.gender },
              ].map(item => (
                <div key={item.label} className="bg-[#FAFBFC] border border-[#F1F5F9] rounded-xl p-3 text-center">
                  <item.icon className="w-4 h-4 text-[#64748B] mx-auto mb-1" />
                  <p className="text-sm font-bold text-[#0F172A]" style={{ fontFamily: '"DM Sans",sans-serif' }}>{item.value}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] rounded-xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="w-4 h-4 text-[#2563EB]" />
                <p className="text-xs font-bold text-[#1D4ED8]">Treating Oncologist</p>
              </div>
              <p className="text-sm font-bold text-[#0F172A]">{patient.oncologist}</p>
              <p className="text-xs text-[#64748B]">{patient.institution}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-[#94A3B8]">Current Treatment</p>
                  <p className="text-xs font-semibold text-[#0F172A]">{patient.treatment}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#94A3B8]">Cycle</p>
                  <p className="text-xs font-semibold text-[#0F172A]">{patient.treatmentCycle} / {patient.totalCycles}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}