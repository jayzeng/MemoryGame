import React from 'react';
import { WORLDS } from '../constants';
import { Button } from './Button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Play } from 'lucide-react';

export const WorldSelect: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#CDEBFF] p-6 pb-12">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-4">
            <Link to="/">
                <Button variant="icon">
                    <ArrowLeft size={24} />
                </Button>
            </Link>
            <h1 className="font-heading text-3xl font-bold text-[#6B4F3F]">Select World</h1>
        </header>

        <div className="flex flex-col gap-6">
            {WORLDS.map((world, index) => (
                <div 
                    key={world.id}
                    className="group relative bg-white rounded-[2rem] p-6 shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden border-4 border-transparent hover:border-[#FFF]"
                    style={{ background: world.bgImage }}
                    onClick={() => navigate(`/game/${world.id}`)}
                >
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                             <div className="bg-white/60 backdrop-blur-sm rounded-xl p-2 px-3 inline-block">
                                <span className="font-heading font-bold text-[#6B4F3F] text-xl">World {index + 1}</span>
                             </div>
                             {index === 0 && <div className="bg-[#FFE9A8] rounded-full p-2"><Star size={20} fill="#B48E25" stroke="none"/></div>}
                        </div>
                       
                        <h2 className="font-heading text-3xl font-bold text-[#6B4F3F] mt-2">{world.name}</h2>
                        <p className="font-body text-[#6B4F3F] opacity-80">{world.description}</p>
                        
                        <div className="mt-4 flex items-center gap-3">
                             <div className="flex-1 h-3 bg-white/50 rounded-full overflow-hidden">
                                <div className="h-full bg-[#CFF3E2]" style={{ width: index === 0 ? '40%' : '0%' }}></div>
                             </div>
                             <span className="font-heading font-bold text-sm">{index === 0 ? '3' : '0'}/{world.levels}</span>
                        </div>
                    </div>
                    
                    {/* Decorative Play Button overlay */}
                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
                        <Play fill="#6B4F3F" size={24} className="ml-1" />
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};