export function JiffyLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Jiffy Clips logo"
    >
      <rect width="48" height="48" rx="12" fill="#0F0F0F" />
      {/* speed lines — "in a jiffy" */}
      <rect x="7" y="15.5" width="9" height="3" rx="1.5" fill="#25F4EE" />
      <rect x="5" y="22.5" width="11" height="3" rx="1.5" fill="#FE2C55" />
      <rect x="7" y="29.5" width="9" height="3" rx="1.5" fill="#25F4EE" />
      {/* play triangle with chromatic echoes */}
      <path d="M20.5 15.5 L36.5 25.5 L20.5 35.5 Z" fill="#25F4EE" />
      <path d="M23.5 12.5 L39.5 22.5 L23.5 32.5 Z" fill="#FE2C55" />
      <path d="M22 14 L38 24 L22 34 Z" fill="white" />
    </svg>
  );
}

export function JiffyLogo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <JiffyLogoMark size={size} />
      <span
        className="font-bold tracking-tight text-white"
        style={{ fontSize: size * 0.55 }}
      >
        Jiffy<span className="text-[#FE2C55]">Clips</span>
      </span>
    </div>
  );
}
