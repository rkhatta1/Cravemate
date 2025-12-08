import React from 'react';
import { GoogleIcon } from './Icons';
import { Loader2 } from 'lucide-react';

const GoogleSignInButton = ({
  variant = 'dark',
  className = '',
  onClick,
  text = "Sign in with Google",
  isLoading = false
}) => {
  const baseStyles = "flex items-center justify-center gap-3 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    light: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm focus:ring-gray-200",
    dark: "bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 focus:ring-neutral-900 border border-transparent",
    outline: "bg-transparent text-neutral-900 border border-neutral-300 hover:bg-neutral-50 focus:ring-neutral-200"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="w-5 h-5" />
      )}
      <span>{isLoading ? "Loading..." : text}</span>
    </button>
  );
};
export default GoogleSignInButton;