import { useState } from 'react'
import {
  Video,
  Plus,
  Search,
  Clock,
  Shield,
  Radio,
} from 'lucide-react'
import { mockMeetings } from '../../data/mockMeetings.js'
import MeetingCard from './MeetingCard.jsx'
import MeetingRoomModal from './MeetingRoomModal.jsx'
import ScheduleMeetingModal from './ScheduleMeetingModal.jsx'

export default function MeetingsPage() {
  const [meetingsList, setMeetingsList] = useState(mockMeetings)
  const [filterTab, setFilterTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals state
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  const handleScheduleSuccess = (newM) => {
    const created = {
      id: `MEET-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newM.reason || 'Virtual Consultation',
      doctor: newM.doctor.split('—')[0].trim(),
      specialty: newM.doctor.split('—')[1]?.trim() || 'Medical Specialist',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
      date: newM.date,
      startTime: newM.time,
      endTime: '45 mins',
      status: 'upcoming',
      meetingUrl: 'https://meet.telehealth-care.org/room/new-meeting',
      passcode: `CARE-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'Tele-Oncology',
      notes: newM.notes,
      participants: [
        { name: newM.doctor.split('—')[0].trim(), role: 'Physician', avatar: '', online: false },
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
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Online Meetings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Join video consultations with your healthcare doctors securely from your browser.
          </p>
        </div>

        <button
          onClick={() => setIsScheduleOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Schedule Meeting</span>
        </button>
      </div>

      {/* Simplified Live Consultation Banner */}
      {liveMeeting && (
        <div className="rounded-xl p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Live Consultation Ready
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold">
              {liveMeeting.title}
            </h2>
            <p className="text-xs text-slate-300">
              Doctor: <strong className="text-white">{liveMeeting.doctor}</strong> ({liveMeeting.specialty})
            </p>
          </div>

          <button
            onClick={() => setActiveMeetingRoom(liveMeeting)}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Video size={16} />
            <span>Join Live Consultation</span>
          </button>
        </div>
      )}

      {/* Control Strip: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: meetingsList.length },
            { id: 'live', label: 'Live Now', count: liveCount },
            { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { id: 'completed', label: 'Completed', count: meetingsList.filter((m) => m.status === 'completed').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-200 text-gray-700">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-300 bg-white text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600"
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
              onSchedule={() => setIsScheduleOpen(true)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-6 space-y-2">
          <p className="text-sm font-semibold text-gray-800">No Meetings Found</p>
          <p className="text-xs text-gray-500">
            There are no meetings matching your filter tab or search query.
          </p>
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            Schedule a Consultation
          </button>
        </div>
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
