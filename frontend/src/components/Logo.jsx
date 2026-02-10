import React from 'react';

export default function Logo({ className = "h-10 w-auto" }) {
    return (
        <svg
            viewBox="0 0 300 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D" />{/* lighter gold */}
                    <stop offset="25%" stopColor="#D97706" />{/* darker gold */}
                    <stop offset="50%" stopColor="#FCD34D" />
                    <stop offset="75%" stopColor="#B45309" />
                    <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
            </defs>

            {/* Icon: Globe + Dollar */}
            <g transform="translate(10, 10) scale(0.6)">
                {/* Globe Circle Outline */}
                <circle cx="50" cy="50" r="45" stroke="url(#gold-gradient)" strokeWidth="5" />

                {/* Dollar Sign */}
                <path
                    d="M50 15 V85 M35 30 H60 C70 30 70 50 60 50 H40 C30 50 30 70 40 70 H65"
                    stroke="url(#gold-gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </g>

            {/* Text part 1: СВІТ */}
            <text x="80" y="45" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="38" fill="url(#gold-gradient)">
                СВІТ
            </text>

            {/* Text part 2: ВАЛЮТ */}
            <text x="80" y="75" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="24" fill="url(#gold-gradient)" letterSpacing="2">
                ВАЛЮТ
            </text>

            {/* Subtitle: ОБМІН ВАЛЮТ (small) */}
            <text x="175" y="75" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="url(#gold-gradient)" letterSpacing="1" opacity="0.8">
                ОБМІН ВАЛЮТ
            </text>
        </svg>
    );
}
