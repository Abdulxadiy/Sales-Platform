import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, AlertCircle } from 'lucide-react';

export default function VoiceRecorder({ onSend, onCancel, isCompact = false }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function initRecorder() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Brauzeringiz ovoz yozishni qo‘llab-quvvatlamaydi.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        // Preferred mime types
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }

        const options = mimeType ? { mimeType } : undefined;
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(100);
        setRecording(true);

        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        if (!active) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Mikrofon ruxsati berilmadi. Iltimos mikrofonga ruxsat bering.');
        } else {
          setError('Ovoz yozishda xatolik yuz berdi: ' + (err.message || 'Noma‘lum'));
        }
      }
    }

    initRecorder();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  };

  const handleDiscard = () => {
    cleanup();
    onCancel();
  };

  const handleSend = () => {
    if (!mediaRecorderRef.current || duration === 0) {
      handleDiscard();
      return;
    }

    const recorder = mediaRecorderRef.current;
    const recordedDuration = duration;

    recorder.onstop = () => {
      const mime = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      cleanup();
      onSend(audioBlob, recordedDuration);
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (error) {
    return (
      <div className="support-voice-recorder error">
        <div className="support-voice-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleDiscard}>
          Yopish
        </button>
      </div>
    );
  }

  return (
    <div className={`support-voice-recorder ${isCompact ? 'compact' : ''}`}>
      <div className="support-voice-left">
        <div className="support-voice-live-dot" />
        <span className="support-voice-duration">{formatTime(duration)}</span>
      </div>

      <div className="support-voice-waves">
        <span className="wave-bar b1" />
        <span className="wave-bar b2" />
        <span className="wave-bar b3" />
        <span className="wave-bar b4" />
        <span className="wave-bar b5" />
        <span className="wave-bar b6" />
        <span className="wave-bar b7" />
        <span className="wave-bar b8" />
      </div>

      <div className="support-voice-actions">
        <button
          type="button"
          className="support-voice-cancel-btn"
          title="Bekor qilish"
          onClick={handleDiscard}
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          className="btn btn-primary support-voice-send-btn"
          title="Yuborish"
          onClick={handleSend}
          disabled={!recording || duration === 0}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
