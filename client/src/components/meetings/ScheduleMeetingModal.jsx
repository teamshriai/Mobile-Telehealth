import { useState } from 'react'
import { Video, CheckCircle2, ShieldCheck } from 'lucide-react'
import Modal from '../common/Modal.jsx'
import Button from '../common/Button.jsx'

export default function ScheduleMeetingModal({ isOpen, onClose, onScheduleSuccess }) {
  const [formData, setFormData] = useState({
    doctor: 'Dr. Priya Nair',
    specialty: 'Vascular Neurology',
    date: new Date().toISOString().split('T')[0],
    time: '10:30 AM',
    reason: 'Follow-up on NIHSS assessment',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      onScheduleSuccess?.(formData)
    }, 400)
  }

  const handleClose = () => {
    setSubmitted(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submitted ? 'Meeting Scheduled' : 'Schedule Online Meeting'}
      subtitle={
        submitted
          ? 'Your virtual meeting room PIN has been generated.'
          : 'Book an online telehealth video meeting with your doctor.'
      }
      size="md"
      footer={
        submitted ? (
          <Button variant="primary" size="sm" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={<Video size={14} />} onClick={handleSubmit}>
              Schedule Meeting
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="flex flex-col items-center text-center py-5 gap-3">
          <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center">
            <CheckCircle2 size={26} className="text-[#16A34A]" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#0F172A]">Meeting Scheduled Successfully!</h4>
            <p className="text-xs text-[#64748B] mt-1 max-w-xs">
              A meeting link and confirmation details have been generated for your portal account.
            </p>
          </div>

          <div className="w-full p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E8EDF2] text-left text-xs space-y-1.5 mt-2">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Doctor:</span>
              <span className="font-semibold text-[#0F172A]">{formData.doctor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Date & Time:</span>
              <span className="font-semibold text-[#0F172A]">{formData.date} at {formData.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Mode:</span>
              <span className="font-semibold text-[#2563EB] flex items-center gap-1">
                <ShieldCheck size={13} /> Online HD Video
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[#475569] font-medium mb-1">Doctor</label>
            <select
              value={formData.doctor}
              onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E8EDF2] bg-white text-[#0F172A] text-xs focus:outline-none focus:border-[#2563EB] focus-ring"
            >
              <option>Dr. Priya Nair — Lead Vascular Neurologist</option>
              <option>Meera Pillai, NP — Neuro Rehabilitation Specialist</option>
              <option>Dr. Rajan Mehta — Radiologist</option>
              <option>Dr. James Okafor — Neurosurgeon</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#475569] font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-lg border border-[#E8EDF2] bg-white text-[#0F172A] text-xs focus:outline-none focus:border-[#2563EB] focus-ring"
              />
            </div>
            <div>
              <label className="block text-[#475569] font-medium mb-1">Time</label>
              <select
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E8EDF2] bg-white text-[#0F172A] text-xs focus:outline-none focus:border-[#2563EB] focus-ring"
              >
                <option>09:00 AM</option>
                <option>10:30 AM</option>
                <option>11:15 AM</option>
                <option>02:00 PM</option>
                <option>03:30 PM</option>
                <option>04:15 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#475569] font-medium mb-1">Reason for Visit</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Check test results, general consultation..."
              className="w-full px-3 py-2 rounded-lg border border-[#E8EDF2] bg-white text-[#0F172A] text-xs focus:outline-none focus:border-[#2563EB] focus-ring"
            />
          </div>

          <div>
            <label className="block text-[#475569] font-medium mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any details you want your doctor to know..."
              className="w-full px-3 py-2 rounded-lg border border-[#E8EDF2] bg-white text-[#0F172A] text-xs focus:outline-none focus:border-[#2563EB] focus-ring resize-none"
            />
          </div>
        </form>
      )}
    </Modal>
  )
}
