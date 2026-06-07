// CardStrike - Settings Page
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function Settings() {
  const { settings, updateSettings } = useGameStore();
  const navigate = useNavigate();

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      updateSettings({ fullscreen: true });
    } else {
      document.exitFullscreen();
      updateSettings({ fullscreen: false });
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center felt-texture overflow-y-auto">
      <motion.div
        className="w-full max-w-md mx-4 my-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">⚙️</div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        <div
          className="rounded-3xl p-6 shadow-2xl"
          style={{
            background: 'rgba(5,15,10,0.95)',
            border: '1px solid rgba(201,162,39,0.2)',
          }}
        >
          <div className="space-y-5">
            {/* Music volume */}
            <SliderSetting
              label="🎵 Music Volume"
              value={settings.musicVolume}
              onChange={v => updateSettings({ musicVolume: v })}
            />

            {/* SFX volume */}
            <SliderSetting
              label="🔊 Sound Effects"
              value={settings.sfxVolume}
              onChange={v => updateSettings({ sfxVolume: v })}
            />

            {/* Animation speed */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium block mb-2">
                ⚡ Animation Speed
              </label>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map(speed => (
                  <motion.button
                    key={speed}
                    className="flex-1 py-2 rounded-xl text-sm font-medium capitalize"
                    style={{
                      background: settings.animationSpeed === speed
                        ? 'rgba(201,162,39,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      border: settings.animationSpeed === speed
                        ? '1px solid rgba(201,162,39,0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: settings.animationSpeed === speed ? '#f0c040' : '#888',
                    }}
                    onClick={() => updateSettings({ animationSpeed: speed })}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    {speed}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <ToggleSetting
                label="🎨 Reduced Motion"
                description="Disable animations for accessibility"
                value={settings.reducedMotion}
                onChange={v => updateSettings({ reducedMotion: v })}
              />
              <ToggleSetting
                label="👁 Colorblind Mode"
                description="Enhanced suit distinction"
                value={settings.colorblindMode}
                onChange={v => updateSettings({ colorblindMode: v })}
              />
              <ToggleSetting
                label="⛶ Fullscreen"
                description="Play in fullscreen mode"
                value={settings.fullscreen}
                onChange={handleFullscreen}
              />
            </div>
          </div>

          <motion.button
            className="w-full mt-6 py-3 rounded-2xl font-bold text-black text-sm uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #c9a227, #f0c040)' }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(201,162,39,0.4)' }}
            whileTap={{ scale: 0.98 }}
          >
            ← Back to Menu
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function SliderSetting({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</label>
        <span className="text-yellow-400 text-xs font-mono">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #c9a227 ${value}%, rgba(255,255,255,0.1) ${value}%)`,
          accentColor: '#c9a227',
        }}
      />
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => onChange(!value)}
    >
      <div>
        <div className="text-sm text-white font-medium">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <motion.div
        className="w-12 h-6 rounded-full relative flex-shrink-0 ml-4"
        style={{
          background: value ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)',
          border: value ? '1px solid rgba(201,162,39,0.5)' : '1px solid rgba(255,255,255,0.1)',
        }}
        animate={{ background: value ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)' }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full"
          style={{ background: value ? '#c9a227' : '#555' }}
          animate={{ x: value ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </div>
  );
}
