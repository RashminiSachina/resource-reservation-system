"use client";

import { useState, useEffect } from "react";

interface Reservation {
  id: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED";
}

interface AvailabilityTimetableProps {
  resourceId: string;
  resourceName: string;
  categoryName: string;
  onSlotSelect: (startTime: string, endTime: string) => void;
  onClose: () => void;
}

export default function AvailabilityTimetable({
  resourceId,
  resourceName,
  categoryName,
  onSlotSelect,
  onClose,
}: AvailabilityTimetableProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Navigate to previous/next day
  const navigateDay = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  // Fetch reservations for selected date
  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/user/resource/${resourceId}/availability?date=${formatDateForAPI(selectedDate)}`
        );
        if (!response.ok) {
          throw new Error("Failed to load availability");
        }
        const data = await response.json();
        setReservations(data.reservations || []);
      } catch (err) {
        setError("Unable to load availability. Please try again.");
        setReservations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [resourceId, selectedDate]);

  // Generate hourly slots for the day
  const generateHourlySlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const start = new Date(selectedDate);
      start.setUTCHours(hour, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setUTCHours(hour + 1, 0, 0, 0);

      // Check if this slot overlaps with any reservation
      const isBooked = reservations.some((res) => {
        const resStart = new Date(res.startTime);
        const resEnd = new Date(res.endTime);
        return resStart < end && resEnd > start;
      });

      slots.push({
        hour,
        start: start.toISOString(),
        end: end.toISOString(),
        isBooked,
      });
    }
    return slots;
  };

  const hourlySlots = generateHourlySlots();

  const handleSlotClick = (slot: { start: string; end: string; isBooked: boolean }) => {
    if (slot.isBooked) return;
    setSelectedSlot({ start: slot.start, end: slot.end });
  };

  const handleConfirmSelection = () => {
    if (selectedSlot) {
      onSlotSelect(selectedSlot.start, selectedSlot.end);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0052CC] to-[#0047B3] p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{resourceName}</h2>
              <p className="text-white/90">{categoryName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 hover:bg-white/20 rounded-md transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="font-semibold text-lg">{formatDate(selectedDate)}</span>
            <button
              onClick={() => navigateDay(1)}
              className="p-2 hover:bg-white/20 rounded-md transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-200" />
            <span className="text-sm text-[#6B7280]">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-rose-100 to-pink-100 border border-rose-200" />
            <span className="text-sm text-[#6B7280]">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-[#0052CC] to-[#0047B3] border border-[#0047B3]" />
            <span className="text-sm text-[#6B7280]">Selected</span>
          </div>
        </div>

        {/* Timetable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0052CC] border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {hourlySlots.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.hour}
                    onClick={() => handleSlotClick(slot)}
                    disabled={slot.isBooked}
                    className={`
                      rounded-lg p-3 text-center transition-all
                      ${
                        slot.isBooked
                          ? "bg-gradient-to-r from-rose-100 to-pink-100 border border-rose-200 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "bg-gradient-to-r from-[#0052CC] to-[#0047B3] border border-[#0047B3] text-white shadow-md"
                          : "bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-200 hover:from-emerald-200 hover:to-green-200 cursor-pointer"
                      }
                    `}
                  >
                    <div className="text-xs font-semibold mb-1">
                      {formatTime(slot.start)}
                    </div>
                    <div className="text-xs opacity-75">
                      {formatTime(slot.end)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] p-4 bg-[#FAFAF9]">
          {selectedSlot ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  Selected: {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
                </p>
                <p className="text-xs text-[#6B7280]">1 hour slot</p>
              </div>
              <button
                onClick={handleConfirmSelection}
                className="rounded-md bg-gradient-to-r from-[#84CC16] to-[#6DB30F] px-6 py-2 text-sm font-medium text-white hover:from-[#6DB30F] hover:to-[#5FA30E] transition-all shadow-sm"
              >
                Continue to Booking
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#6B7280] text-center">
              Select an available time slot to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
