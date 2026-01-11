/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "#000000",
                card: "#09090b", // zinc-950
                primary: "#06b6d4", // cyan-500
                secondary: "#27272a", // zinc-800
                text: "#ffffff",
                muted: "#71717a", // zinc-500
            },
        },
    },
    plugins: [],
}
