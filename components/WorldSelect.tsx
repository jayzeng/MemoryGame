import React from 'react';
import { WORLDS } from '../constants';
import { Button } from './Button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Play } from 'lucide-react';

export const WorldSelect: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#CDEBFF] p-6 pb-12 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="max-w-md mx-auto flex flex-col gap-8">
        <header className="flex items-center gap-6">
            <Link to="/">
                <Button variant="icon" className="hover:scale-110 transition-transform">
                    <ArrowLeft size={24} />
                </Button>
            </Link>
            <h1 className="font-heading text-4xl font-bold text-[#6B4F3F] drop-shadow-sm">World Select</h1>
        </header>

        <div className="flex flex-col gap-8">
            {WORLDS.map((world, index) => (
                <div 
                    key={world.id}
                    className="group relative bg-white rounded-[2.5rem] p-8 shadow-[0_15px_35px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] hover:-translate-y-1 active:scale-[0.98] cursor-pointer overflow-hidden border-4 border-white"
                    style={{ background: world.bgImage }}
                    onClick={() => navigate(`/game/${world.id}`)}
                >
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                             <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 px-4 inline-block shadow-sm">
                                <span className="font-heading font-bold text-[#6B4F3F] text-lg uppercase tracking-widest">World {index + 1}</span>
                             </div>
                             {index === 0 && (
                                <div className="bg-[#FFE9A8] rounded-full p-2.5 shadow-md animate-bounce duration-[2000ms]">
                                    <Star size={24} fill="#B48E25" stroke="none"/>
                                </div>
                             )}
                        </div>
                       
                        <h2 className="font-heading text-4xl font-bold text-[#6B4F3F] mt-2 drop-shadow-sm">{world.name}</h2>
                        <p className="font-body text-[#6B4F3F] opacity-90 text-lg leading-relaxed max-w-[80%]">{world.description}</p>
                        
                        <div className="mt-6 flex items-center gap-4 bg-white/30 backdrop-blur-md p-3 rounded-2xl border border-white/40">
                             <div className="flex-1 h-4 bg-white/50 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-[#CFF3E2] to-[#A0E8C4] rounded-full shadow-sm" style={{ width: index === 0 ? '40%' : '0%' }}></div>
                             </div>
                             <span className="font-heading font-bold text-[#6B4F3F] text-base">{index === 0 ? '3' : '0'}/{world.levels}</span>
                        </div>
                    </div>
                    
                    {/* Premium Play Button overlay */}
                    <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 bg-white rounded-full p-4 shadow-2xl scale-75 group-hover:scale-100">
                        <Play fill="#6B4F3F" size={32} className="ml-1 text-[#6B4F3F]" />
                    </div>
                    
                    {/* Subtle decorative circle */}
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};