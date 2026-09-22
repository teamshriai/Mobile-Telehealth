import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate } from '../../components/clinic/format.js'
import Button from '../../components/common/Button.jsx'
import FormField from '../../components/onboarding/FormField.jsx'
import * as doctorSelf from '../../services/doctorSelf.service.js'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const emptySlot = { dayOfWeek: '1', startTime: '09:00', endTime: '17:00', slotDurationMins: '30' }
const emptyLeave = { startDate: '', endDate: '', reason: '' }

export default function DoctorAvailabilityPage() {
  const [slots, setSlots] = useState(null)
  const [leaves, setLeaves] = useState([])
  const [newSlot, setNewSlot] = useState(emptySlot)
  const [newLeave, setNewLeave] = useState(emptyLeave)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    doctorSelf
      .listAvailability()
      .then((data) => {
        setSlots(data.slots)
        setLeaves(data.leaves)
      })
      .catch(() => setError('Could not load your availability.'))
  }

  useEffect(load, [])

  const addSlot = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await doctorSelf.addAvailabilitySlot({
        dayOfWeek: Number(newSlot.dayOfWeek),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        slotDurationMins: Number(newSlot.slotDurationMins),
      })
      setNewSlot(emptySlot)
      load()
    } catch (err) {
      setError(err.message || 'Could not add that slot.')
    } finally {
      setSaving(false)
    }
  }

  const removeSlot = async (id) => {
    try {
      await doctorSelf.removeAvailabilitySlot(id)
      load()
    } catch {
      setError('Could not remove that slot.')
    }
  }

  const toggleSlot = async (slot) => {
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, isActive: !s.isActive } : s)))
    try {
      await doctorSelf.setAvailabilitySlotActive(slot.id, !slot.isActive)
    } catch {
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, isActive: slot.isActive } : s)))
      setError('Could not update that slot.')
    }
  }

  const addLeave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await doctorSelf.addLeave(newLeave)
      setNewLeave(emptyLeave)
      load()
    } catch (err) {
      setError(err.message || 'Could not add that leave period.')
    } finally {
      setSaving(false)
    }
  }

  const removeLeave = async (id) => {
    try {
      await doctorSelf.removeLeave(id)
      load()
    } catch {
      setError('Could not remove that leave period.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Availability
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your recurring weekly hours. Your hospital and patients see this when scheduling.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-border-soft bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Weekly hours</h2>

        {slots === null ? (
          <p className="text-sm text-ink-subtle">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-ink-subtle">
            No hours set yet — add your first slot below.
          </p>
        ) : (
          <ul className="space-y-1">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2"
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.isActive}
                  aria-label={`${DAYS[slot.dayOfWeek]} ${slot.startTime} to ${slot.endTime}`}
                  onClick={() => toggleSlot(slot)}
                  className={`focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    slot.isActive
                      ? 'bg-primary-600'
                      : 'bg-surface-3'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface-1 shadow transition-[left] ${
                      slot.isActive ? 'left-[1.125rem]' : 'left-0.5'
                    }`}
                  />
                </button>

                <span
                  className={`min-w-0 flex-1 text-sm ${
                    slot.isActive
                      ? 'text-ink'
                      : 'text-ink-subtle line-through'
                  }`}
                >
                  <strong className="font-semibold">{DAYS[slot.dayOfWeek]}</strong> —{' '}
                  <span className="tabular-nums">
                    {slot.startTime}–{slot.endTime}
                  </span>{' '}
                  <span className="text-ink-subtle">
                    ({slot.slotDurationMins} min slots)
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  aria-label={`Remove ${DAYS[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`}
                  className="focus-ring shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-critical-bg hover:text-critical-fg"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addSlot}
          className="mt-4 grid grid-cols-2 gap-3 border-t border-border-soft pt-4 sm:grid-cols-4"
        >
          <FormField
            as="select"
            label="Day"
            name="dayOfWeek"
            required
            value={newSlot.dayOfWeek}
            onChange={(e) => setNewSlot((s) => ({ ...s, dayOfWeek: e.target.value }))}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </FormField>
          <FormField
            label="Start"
            name="startTime"
            type="time"
            required
            value={newSlot.startTime}
            onChange={(e) => setNewSlot((s) => ({ ...s, startTime: e.target.value }))}
          />
          <FormField
            label="End"
            name="endTime"
            type="time"
            required
            value={newSlot.endTime}
            onChange={(e) => setNewSlot((s) => ({ ...s, endTime: e.target.value }))}
          />
          <div className="flex items-end">
            <Button type="submit" icon={<Plus size={15} />} loading={saving} fullWidth>
              Add
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Leave periods</h2>

        {leaves.length === 0 ? (
          <p className="text-sm text-ink-subtle">No leave recorded.</p>
        ) : (
          <ul className="space-y-1">
            {leaves.map((leave) => (
              <li
                key={leave.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm hover:bg-surface-2"
              >
                <span className="min-w-0 text-ink">
                  <span className="tabular-nums">
                    {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                  </span>
                  {leave.reason && (
                    <span className="text-ink-subtle"> — {leave.reason}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeLeave(leave.id)}
                  aria-label="Remove leave period"
                  className="focus-ring shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-critical-bg hover:text-critical-fg"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addLeave}
          className="mt-4 grid grid-cols-1 gap-3 border-t border-border-soft pt-4 sm:grid-cols-4"
        >
          <FormField
            label="From"
            name="startDate"
            type="date"
            required
            value={newLeave.startDate}
            onChange={(e) => setNewLeave((s) => ({ ...s, startDate: e.target.value }))}
          />
          <FormField
            label="To"
            name="endDate"
            type="date"
            required
            value={newLeave.endDate}
            onChange={(e) => setNewLeave((s) => ({ ...s, endDate: e.target.value }))}
          />
          <FormField
            label="Reason"
            name="reason"
            value={newLeave.reason}
            onChange={(e) => setNewLeave((s) => ({ ...s, reason: e.target.value }))}
          />
          <div className="flex items-end">
            <Button
              type="submit"
              icon={<Plus size={15} />}
              loading={saving}
              fullWidth
              disabled={!newLeave.startDate || !newLeave.endDate}
            >
              Add
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
