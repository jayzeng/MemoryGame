import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-heading font-bold rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-sm";
  
  const variants = {
    primary: "bg-[#FFD6E8] text-[#6B4F3F] hover:bg-[#ffc2dd] px-8 py-4 text-xl border-b-4 border-[#ffb3d4]",
    secondary: "bg-[#DCCBFF] text-[#6B4F3F] hover:bg-[#cbb5ff] px-6 py-3 text-lg border-b-4 border-[#bca1ff]",
    icon: "bg-white p-3 rounded-full shadow-md text-[#6B4F3F] hover:bg-gray-50 border-b-4 border-gray-200 aspect-square"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};