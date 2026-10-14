import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, AlertCircle } from 'lucide-react';

export default function VoiceRecorder({ onSend, onCancel, isCompact = false }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volumeLevels, setVolumeLevels] = useState([8, 14, 20, 10, 18, 22, 12, 8]);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function initRecorder() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Brauzeringiz ovoz yozishni qo‘llab-quvvatlamaydi.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        // Connect Web Audio API Analyser to visualize voice in real-time
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              if (!active) return;
              analyser.getByteFrequencyData(dataArray);
              // Map frequency bins to 8 wave bars
              const newLevels = [];
              for (let i = 0; i < 8; i++) {
                const val = dataArray[i * 2] || dataArray[0] || 0;
                // Height between 6px and 28px
                const barHeight = Math.max(6, Math.min(28, Math.round(6 + (val / 255) * 22)));
                newLevels.push(barHeight);
              }
              setVolumeLevels(newLevels);
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            animFrameRef.current = requestAnimationFrame(updateMeter);
          }
        } catch (_) {
          // AudioContext visualizer fallback if browser restricts
        }

        // Preferred mime types
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
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
          setError('Mikrofon ruxsati berilmadi. Iltimos, mikrofonga ruxsat bering.');
        } else {
          setError('Ovoz yozishda xatolik yuz berdi: ' + (err.message || 'Noma‘lum'));
        }
      }
    }

    initRecorder();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (_) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (_) {}
      audioCtxRef.current = null;
    }
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
    if (!mediaRecorderRef.current) {
      handleDiscard();
      return;
    }

    const recorder = mediaRecorderRef.current;
    const recordedDuration = Math.max(1, duration);

    recorder.onstop = () => {
      if (audioChunksRef.current.length === 0) {
        cleanup();
        onCancel();
        return;
      }
      const mime = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      cleanup();
      onSend(audioBlob, recordedDuration);
    };

    if (recorder.state === 'recording') {
      try {
        recorder.requestData();
      } catch (_) {}
      recorder.stop();
    } else if (recorder.state !== 'inactive') {
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

      <div className="support-voice-waves" title="Mikrofon faol">
        {volumeLevels.map((lvl, idx) => (
          <span
            key={idx}
            className="wave-bar"
            style={{
              height: `${lvl}px`,
              transition: 'height 0.08s ease',
            }}
          />
        ))}
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
          disabled={!recording}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
