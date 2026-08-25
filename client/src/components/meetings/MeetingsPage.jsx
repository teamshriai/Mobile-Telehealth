import { useState } from 'react'
import { Video, Plus, Search } from 'lucide-react'
import { mockMeetings } from '../../data/mockMeetings.js'
import MeetingCard from './MeetingCard.jsx'
import MeetingRoomModal from './MeetingRoomModal.jsx'
import ScheduleMeetingModal from './ScheduleMeetingModal.jsx'
import SectionTitle from '../common/SectionTitle.jsx'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'

export default function MeetingsPage() {
  const [meetingsList, setMeetingsList] = useState(mockMeetings)
  const [filterTab, setFilterTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals state
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  const handleScheduleSuccess = (newM) => {
    const doctorParts = (newM.doctor || '').split('—')
    const doctorName = doctorParts[0]?.trim() || 'Care Team Physician'
    const doctorSpecialty = doctorParts[1]?.trim() || 'Medical Specialist'

    const created = {
      id: `MEET-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newM.reason || 'Virtual Consultation',
      doctor: doctorName,
      specialty: doctorSpecialty,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
      date: newM.date,
      startTime: newM.time,
      endTime: '45 mins',
      status: 'upcoming',
      meetingUrl: 'https://meet.telehealth-care.org/room/new-meeting',
      passcode: `CARE-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'Tele-Neurology',
      notes: newM.notes,
      participants: [
        { name: doctorName, role: 'Physician', avatar: '', online: false },
        { name: 'Anand Krishnamurthy', role: 'Patient', avatar: '', online: false },
      ],
      agenda: ['Initial consultation & symptoms review'],
    }
    setMeetingsList((prev) => [created, ...prev])
  }

  // Filter meetings
  const filteredMeetings = meetingsList.filter((m) => {
    const matchesTab =
      filterTab === 'all'
        ? true
        : filterTab === 'live'
        ? m.status === 'live'
        : filterTab === 'upcoming'
        ? m.status === 'upcoming'
        : m.status === 'completed'

    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  const liveCount = meetingsList.filter((m) => m.status === 'live').length
  const upcomingCount = meetingsList.filter((m) => m.status === 'upcoming').length
  const liveMeeting = meetingsList.find((m) => m.status === 'live')

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionTitle
          title="Online Meetings"
          subtitle="Join video consultations with your healthcare doctors securely from your browser."
          size="xl"
        />

        <Button
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => setIsScheduleOpen(true)}
          className="self-start sm:self-auto"
        >
          Schedule Meeting
        </Button>
      </div>

      {/* Live Consultation Banner */}
      {liveMeeting && (
        <div className="rounded-xl p-5 bg-[#0F172A] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Consultation Ready
            </span>
            <h2 className="text-base sm:text-lg font-bold truncate">
              {liveMeeting.title}
            </h2>
            <p className="text-xs text-slate-400">
              Doctor: <span className="text-white font-semibold">{liveMeeting.doctor}</span> · {liveMeeting.specialty}
            </p>
          </div>

          <Button
            variant="success"
            size="md"
            icon={<Video size={14} />}
            onClick={() => setActiveMeetingRoom(liveMeeting)}
            className="flex-shrink-0"
          >
            Join Live Consultation
          </Button>
        </div>
      )}

      {/* Control Strip: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F8FAFC] p-2 rounded-xl border border-[#E8EDF2]">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'All', count: meetingsList.length },
            { id: 'live', label: 'Live Now', count: liveCount },
            { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { id: 'completed', label: 'Completed', count: meetingsList.filter((m) => m.status === 'completed').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-white text-[#2563EB] shadow-sm border border-[#E8EDF2] font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A] border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F1F5F9] text-[#64748B]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8EDF2] bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus-ring"
          />
        </div>
      </div>

      {/* Grid of Meeting Cards */}
      {filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onJoin={(m) => setActiveMeetingRoom(m)}
            />
          ))}
        </div>
      ) : (
        <Card variant="ghost" padding="xl" className="text-center space-y-2">
          <p className="text-sm font-semibold text-[#0F172A]">No Meetings Found</p>
          <p className="text-xs text-[#64748B]">
            There are no meetings matching your filter tab or search query.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
            className="mt-2"
          >
            Schedule a Consultation
          </Button>
        </Card>
      )}

      {/* Modals */}
      <MeetingRoomModal
        meeting={activeMeetingRoom}
        isOpen={!!activeMeetingRoom}
        onClose={() => setActiveMeetingRoom(null)}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onScheduleSuccess={handleScheduleSuccess}
      />
    </div>
  )
}
