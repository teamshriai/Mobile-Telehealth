import { useState, useEffect } from 'react'
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Shield,
  Send,
  X,
} from 'lucide-react'

export default function MeetingRoomModal({ meeting, isOpen, onClose }) {
  const [micOn, setMicOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [showPanelMobile, setShowPanelMobile] = useState(false)
  
  // Chat state inside meeting
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Dr. Priya Nair', text: 'Hello Anand! I have loaded your latest imaging and NIHSS assessment.', time: '10:31 AM', isDoctor: true },
    { id: 2, sender: 'You', text: 'Good morning Doctor. Thank you, I can hear you clearly.', time: '10:32 AM', isDoctor: false },
  ])
  const [newMessage, setNewMessage] = useState('')

  // Simulated duration timer
  const [secondsElapsed, setSecondsElapsed] = useState(482)

  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const msg = {
      id: Date.now(),
      sender: 'You',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDoctor: false,
    }
    setMessages((prev) => [...prev, msg])
    setNewMessage('')
  }

  if (!isOpen || !meeting) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75">
      <div className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              LIVE SESSION ({formatTimer(secondsElapsed)})
            </span>
            <h2 className="text-sm font-semibold text-white truncate">
              {meeting.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Shield size={14} className="text-blue-400" />
              <span>Encrypted Video</span>
            </div>
            <button
              onClick={() => setShowPanelMobile((v) => !v)}
              className={`lg:hidden p-1.5 rounded transition-colors ${
                showPanelMobile ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle chat & notes"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Close window"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Grid Area */}
        <div className="relative flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 bg-slate-950">
          {/* Main Doctor Stream Area */}
          <div className="lg:col-span-8 p-3 flex flex-col gap-3 relative overflow-hidden bg-slate-950">
            <div className="flex-1 relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              <img
                src={meeting.avatar}
                alt={meeting.doctor}
                className="w-full h-full object-cover object-center"
              />
              
              {/* Doctor Tag */}
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded bg-slate-900/90 border border-slate-700 text-white text-xs">
                <p className="font-semibold leading-none">{meeting.doctor}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{meeting.specialty}</p>
              </div>

              {/* Self View PIP */}
              <div className="absolute bottom-3 right-3 w-36 aspect-video rounded border border-slate-700 bg-slate-800 overflow-hidden">
                {videoOn ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center relative">
                    <span className="text-xs font-bold text-white">You</span>
                    {!micOn && (
                      <div className="absolute top-1 right-1 p-0.5 rounded bg-red-600 text-white">
                        <MicOff size={10} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500 text-[10px]">
                    Video Off
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tools Panel (Chat / Notes) — a side panel on desktop, a full overlay toggled from
              the header on smaller screens where there isn't room for a persistent side panel */}
          <div
            className={`${showPanelMobile ? 'flex absolute inset-0 z-10' : 'hidden'} lg:static lg:z-auto lg:flex lg:col-span-4 border-l border-slate-800 bg-slate-900 flex-col`}
          >
            <div className="flex items-center border-b border-slate-800 bg-slate-900 lg:hidden px-2 py-1.5">
              <button
                onClick={() => setShowPanelMobile(false)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
              >
                <Video size={13} />
                Back to video
              </button>
            </div>
            <div className="flex border-b border-slate-800 bg-slate-900">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'participants'
                    ? 'border-blue-500 text-blue-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Members ({meeting.participants?.length || 2})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Notes
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full justify-between gap-3">
                  <div className="space-y-2.5 overflow-y-auto">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.isDoctor ? 'items-start' : 'items-end'}`}
                      >
                        <span className="text-[10px] text-slate-500 mb-0.5">{m.sender}</span>
                        <div
                          className={`p-2.5 rounded text-xs max-w-[85%] leading-relaxed ${
                            m.isDoctor
                              ? 'bg-slate-800 text-slate-200 border border-slate-700'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="space-y-2">
                  {meeting.participants?.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                      <div>
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.role}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.online ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {p.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-3 text-slate-300">
                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <p className="font-semibold text-blue-400 mb-1">Agenda</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {meeting.agenda?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <p className="font-semibold text-slate-300 mb-1">Notes</p>
                    <p>{meeting.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Bar Bottom */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`p-2.5 rounded font-medium text-xs flex items-center gap-1.5 transition-colors ${
                micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white'
              }`}
            >
              {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              <span className="hidden sm:inline">{micOn ? 'Mute' : 'Unmute'}</span>
            </button>

            <button
              onClick={() => setVideoOn(!videoOn)}
              className={`p-2.5 rounded font-medium text-xs flex items-center gap-1.5 transition-colors ${
                videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white'
              }`}
            >
              {videoOn ? <Video size={16} /> : <VideoOff size={16} />}
              <span className="hidden sm:inline">{videoOn ? 'Stop Video' : 'Start Video'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <PhoneOff size={15} />
            <span className="hidden sm:inline">Leave Meeting</span>
          </button>
        </div>
      </div>
    </div>
  )
}
