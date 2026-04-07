/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                bg: "#050815",
                panel: "#0b1228",
                line: "#1f2a44",
                ink: "#eef4ff",
                emerald: "#10b981",
                amber: "#f59e0b",
            },
            boxShadow: {
                "lime-glow": "0 0 0 1px rgba(16, 185, 129, 0.14), 0 16px 36px rgba(5, 16, 40, 0.38)",
                electric: "0 0 0 1px rgba(245, 158, 11, 0.35), 0 16px 38px rgba(245, 158, 11, 0.22)",
            },
            keyframes: {
                electricPulse: {
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.42)" },
                    "50%": { boxShadow: "0 0 0 10px rgba(245, 158, 11, 0)" },
                },
            },
            animation: {
                "electric-pulse": "electricPulse 1.8s ease-in-out infinite",
            },
        },
    },
    plugins: [],
};
