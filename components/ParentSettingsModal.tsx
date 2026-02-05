import React from 'react';
import { Button } from './Button';
import { useSparkleMode } from './SparkleModeContext';
import { useParentMode } from './ParentModeContext';
import { useHoliday } from './HolidayContext';
import { Sparkles, X, Volume2, Moon, Sun, Info, Gift, Snowflake } from 'lucide-react';

interface ParentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParentSettingsModal: React.FC<ParentSettingsModalProps> = ({ isOpen, onClose }) => {
  const { isSparkleMode, toggleSparkleMode } = useSparkleMode();
  const { isHoliday, toggleHoliday } = useHoliday();
  const { lockParentMode } = useParentMode();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-[#DCCBFF] animate-in zoom-in-95 duration-300">
        <div className="bg-[#F8FAFC] px-6 py-4 flex items-center justify-between border-b-2 border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#DCCBFF] rounded-lg flex items-center justify-center">
              <Info size={18} className="text-[#6B4F3F]" />
            </div>
            <h2 className="font-heading text-xl text-[#6B4F3F]">Parent Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Sparkle Mode Toggle */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-[#FDF7FF] border-2 border-[#DCCBFF]">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${isSparkleMode ? 'bg-[#FFE9A8]' : 'bg-gray-100'}`}>
                  <Sparkles size={24} className={isSparkleMode ? 'text-[#B48E25]' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-heading text-lg text-[#6B4F3F]">Sparkle Mode</p>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Extra magic effects</p>
                </div>
              </div>
              <button
                onClick={toggleSparkleMode}
                className={`w-14 h-8 rounded-full transition-colors relative ${isSparkleMode ? 'bg-[#CFF3E2]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${isSparkleMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Holiday Mode Toggle */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-[#FFF5F5] border-2 border-[#FFD6E8]">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${isHoliday ? 'bg-[#FFD6E8]' : 'bg-gray-100'}`}>
                  {isHoliday ? <Gift size={24} className="text-[#B33A3A]" /> : <Snowflake size={24} className="text-gray-400" />}
                </div>
                <div>
                  <p className="font-heading text-lg text-[#6B4F3F]">Holiday Mode</p>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Snow & decorations</p>
                </div>
              </div>
              <button
                onClick={toggleHoliday}
                className={`w-14 h-8 rounded-full transition-colors relative ${isHoliday ? 'bg-[#FFD6E8]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${isHoliday ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Other Settings placeholders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-[#F8FAFC] border-2 border-gray-100 opacity-50 cursor-not-allowed">
              <Volume2 size={20} className="text-gray-400 mb-2" />
              <p className="font-heading text-[#6B4F3F]">Sound FX</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Enabled</p>
            </div>
            <div className="p-4 rounded-3xl bg-[#F8FAFC] border-2 border-gray-100 opacity-50 cursor-not-allowed">
              <Sun size={20} className="text-gray-400 mb-2" />
              <p className="font-heading text-[#6B4F3F]">Day Mode</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Always On</p>
            </div>
          </div>

          <div className="pt-2 border-t-2 border-gray-50">
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={() => {
                lockParentMode();
                onClose();
              }}
            >
              Lock Settings
            </Button>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-[0.2em] mt-4">
              Settings automatically lock after 15 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
