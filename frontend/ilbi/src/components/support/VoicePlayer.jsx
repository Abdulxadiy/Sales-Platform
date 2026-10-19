import IlbiLoader from '../common/IlbiLoader';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';

const WAVE_HEIGHTS = [
  6, 12, 18, 14, 22, 16, 26, 20, 15, 24, 28, 18, 12, 22, 16, 25, 20, 14, 8, 16, 12, 6
];

export default function VoicePlayer({ api, conversationId, messageId, duration = 0, isOwn = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (duration > 0 && (!totalDuration || totalDuration === 0)) {
      setTotalDuration(duration);
    }
  }, [duration, totalDuration]);

  const loadAudio = async () => {
    if (audioUrl) return audioUrl;
    try {
      setLoading(true);
      setError(false);
      const blob = await api.voice(conversationId, messageId);
      const audioBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
      setLoading(false);
      return url;
    } catch (err) {
      console.error('Failed to load voice message:', err);
      setLoading(false);
      setError(true);
      return null;
    }
  };

  const handlePlayToggle = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    try {
      let url = audioUrl;
      if (!url) {
        url = await loadAudio();
        if (!url) return;
      }

      if (audioRef.current) {
        if (!audioRef.current.src || audioRef.current.src !== url) {
          audioRef.current.src = url;
        }
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setIsPlaying(false);
      setError(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      const dur = audioRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setTotalDuration(dur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setTotalDuration(dur);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSpeedChange = (e) => {
    e.stopPropagation();
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleWaveformClick = (e) => {
    if (!waveformRef.current || !audioRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (totalDuration || duration || 1);
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const formatTime = (sec) => {
    const s = Math.round(sec || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeDuration = totalDuration || duration || 0;
  const progressRatio = activeDuration > 0
    ? Math.min(1, currentTime / activeDuration)
    : 0;

  if (error) {
    return (
      <div className="support-voice-player error">
        <AlertCircle size={14} />
        <span>Ovozli xabar tinglab bo‘lmadi</span>
        <button
          type="button"
          onClick={() => { setError(false); setAudioUrl(null); }}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, marginLeft: 6, textDecoration: 'underline' }}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className={`support-voice-player ${isOwn ? 'own' : ''}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false);
          setError(true);
        }}
      />

      <button
        type="button"
        className={`support-voice-play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={handlePlayToggle}
        disabled={loading}
        title={isPlaying ? 'To‘xtatish' : 'Tinglash'}
      >
        {loading ? (
          <IlbiLoader size={24} inline decorative />
        ) : isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />
        )}
      </button>

      <div className="support-voice-body">
        <div
          ref={waveformRef}
          className="support-voice-waveform"
          onClick={handleWaveformClick}
          title="Ovozni surish"
        >
          {WAVE_HEIGHTS.map((height, i) => {
            const barRatio = i / (WAVE_HEIGHTS.length - 1);
            const isPlayed = barRatio <= progressRatio;
            return (
              <span
                key={i}
                className={`voice-bar ${isPlayed ? 'played' : ''}`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <div className="support-voice-footer">
          <span className="support-voice-time">
            {formatTime(currentTime)} / {formatTime(totalDuration || duration)}
          </span>

          <button
            type="button"
            className="support-voice-speed-badge"
            onClick={handleSpeedChange}
            title="Ijro tezligi"
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
