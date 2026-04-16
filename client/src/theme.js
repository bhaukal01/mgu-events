import { createTheme } from "@mui/material/styles";

const headingFont = '"Fraunces", serif';
const bodyFont = '"Hanken Grotesk", "Segoe UI", sans-serif';

const theme = createTheme({
    spacing: 8,
    shape: {
        borderRadius: 12,
    },
    palette: {
        mode: "light",
        primary: {
            main: "#1f2937",
            dark: "#111827",
            light: "#374151",
            contrastText: "#f8fafc",
        },
        secondary: {
            main: "#9a6a3a",
            dark: "#7b5227",
            light: "#b6824c",
            contrastText: "#fffaf3",
        },
        success: {
            main: "#2f6f57",
        },
        warning: {
            main: "#b7791f",
        },
        error: {
            main: "#b83b3b",
        },
        background: {
            default: "#f3f1ea",
            paper: "#ffffff",
        },
        text: {
            primary: "#1d2530",
            secondary: "#5b6573",
        },
        divider: "#d7d2c4",
    },
    typography: {
        fontFamily: bodyFont,
        h1: {
            fontFamily: headingFont,
            fontWeight: 700,
            letterSpacing: "-0.02em",
        },
        h2: {
            fontFamily: headingFont,
            fontWeight: 700,
            letterSpacing: "-0.015em",
        },
        h3: {
            fontFamily: headingFont,
            fontWeight: 650,
        },
        h4: {
            fontFamily: headingFont,
            fontWeight: 650,
        },
        h5: {
            fontFamily: headingFont,
            fontWeight: 600,
        },
        h6: {
            fontFamily: headingFont,
            fontWeight: 600,
        },
        button: {
            fontWeight: 600,
            letterSpacing: "0.01em",
            textTransform: "none",
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                "*": {
                    boxSizing: "border-box",
                },
                "html, body, #root": {
                    minHeight: "100%",
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    border: "1px solid #ddd6c6",
                    boxShadow: "0 8px 20px rgba(17, 24, 39, 0.06)",
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    paddingInline: 16,
                    paddingBlock: 8,
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: "#ffffff",
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;
