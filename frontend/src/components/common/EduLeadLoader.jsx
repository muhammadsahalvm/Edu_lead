import React from 'react';

export const EduLeadLoader = ({ label = 'Loading your admissions workspace...' }) => (
  <div
    className="grid min-h-screen place-items-center bg-slate-50 px-6"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <div className="flex flex-col items-center gap-5">
      <div className="edulead-loader-mark-wrap relative grid h-32 w-32 place-items-center">
        <span className="edulead-loader-orbit absolute inset-1 rounded-full border-2 border-[#BFD8E3] border-t-[#00638E]" />
        <span className="edulead-loader-halo absolute inset-5 rounded-full bg-[#BFD8E3]/35" />
        <img
          src="/edulead-main-logo.png"
          alt=""
          className="edulead-loader-mark relative z-10 h-24 w-24 object-contain"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[#004A6B]">EduLead</p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  </div>
);
